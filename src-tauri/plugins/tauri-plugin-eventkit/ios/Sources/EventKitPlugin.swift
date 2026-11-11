import EventKit
import Tauri
import UIKit
import WebKit

/// Arguments arrive as `{ payload: {...} }` for data commands (see src/data/tauriCalendarProvider.ts).
private struct Wrapped<T: Decodable>: Decodable { let payload: T }

private struct FetchArgs: Decodable { let calendarId: String; let start: String; let end: String }
private struct DeleteArgs: Decodable { let externalId: String }
private struct EventArgs: Decodable {
    let externalId: String?
    let calendarId: String
    let title: String
    let notes: String?
    let location: String?
    let start: String
    let end: String
    let allDay: Bool
}

private enum CalError: LocalizedError {
    case noAccess, badDate(String), noCalendar(String)
    var errorDescription: String? {
        switch self {
        case .noAccess: return "Calendar access has not been granted."
        case .badDate(let s): return "Invalid date: \(s)"
        case .noCalendar(let id): return "Calendar not found: \(id)"
        }
    }
}

private let isoOut: ISO8601DateFormatter = {
    let f = ISO8601DateFormatter()
    f.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
    return f
}()
private let isoIn = ISO8601DateFormatter()

private func parseDate(_ s: String) throws -> Date {
    if let d = isoOut.date(from: s) ?? isoIn.date(from: s) { return d }
    throw CalError.badDate(s)
}

class EventKitPlugin: Plugin {
    private let store = EKEventStore()
    private var observer: NSObjectProtocol?

    override func load(webview: WKWebView) {
        // Tell the frontend whenever the calendar database changes (our own writes included;
        // the sync engine is idempotent so that is harmless).
        observer = NotificationCenter.default.addObserver(forName: .EKEventStoreChanged, object: store, queue: .main) { [weak self] _ in
            try? self?.trigger("changed", data: ["at": isoOut.string(from: Date())])
        }
    }

    deinit { if let o = observer { NotificationCenter.default.removeObserver(o) } }

    // MARK: permission

    private var permissionState: String {
        switch EKEventStore.authorizationStatus(for: .event) {
        case .notDetermined: return "undetermined"
        case .denied, .restricted: return "denied"
        default:
            // .fullAccess (iOS 17+) / .authorized (older) allow reads and writes; .writeOnly cannot read.
            if #available(iOS 17.0, *) {
                return EKEventStore.authorizationStatus(for: .event) == .fullAccess ? "granted" : "denied"
            }
            return "granted"
        }
    }

    @objc func getPermission(_ invoke: Invoke) {
        invoke.resolve(["state": permissionState])
    }

    @objc func requestAccess(_ invoke: Invoke) {
        let done: (Bool, Error?) -> Void = { [weak self] _, _ in
            DispatchQueue.main.async { invoke.resolve(["state": self?.permissionState ?? "denied"]) }
        }
        if #available(iOS 17.0, *) {
            store.requestFullAccessToEvents(completion: done)
        } else {
            store.requestAccess(to: .event, completion: done)
        }
    }

    @objc func openSettings(_ invoke: Invoke) {
        DispatchQueue.main.async {
            if let url = URL(string: UIApplication.openSettingsURLString) {
                UIApplication.shared.open(url)
            }
            invoke.resolve()
        }
    }

    // MARK: calendars + events

    private func requireAccess() throws {
        if permissionState != "granted" { throw CalError.noAccess }
    }

    @objc func listCalendars(_ invoke: Invoke) {
        do {
            try requireAccess()
            let def = store.defaultCalendarForNewEvents?.calendarIdentifier
            let list = store.calendars(for: .event).filter { $0.allowsContentModifications }.map {
                ["id": $0.calendarIdentifier, "title": $0.title, "isDefault": $0.calendarIdentifier == def] as [String: Any]
            }
            invoke.resolve(["calendars": list])
        } catch { invoke.reject(error.localizedDescription) }
    }

    private func toJson(_ e: EKEvent) -> [String: Any] {
        var out: [String: Any] = [
            "externalId": e.eventIdentifier ?? "",
            "calendarId": e.calendar.calendarIdentifier,
            "title": e.title ?? "",
            "start": isoOut.string(from: e.startDate),
            "end": isoOut.string(from: e.endDate),
            "allDay": e.isAllDay,
            "lastModified": isoOut.string(from: e.lastModifiedDate ?? e.creationDate ?? Date()),
        ]
        if let n = e.notes, !n.isEmpty { out["notes"] = n }
        if let l = e.location, !l.isEmpty { out["location"] = l }
        return out
    }

    @objc func fetchEvents(_ invoke: Invoke) {
        do {
            try requireAccess()
            let a = try invoke.parseArgs(Wrapped<FetchArgs>.self).payload
            guard let cal = store.calendar(withIdentifier: a.calendarId) else { throw CalError.noCalendar(a.calendarId) }
            let pred = store.predicateForEvents(withStart: try parseDate(a.start), end: try parseDate(a.end), calendars: [cal])
            // Recurring events yield one EKEvent per occurrence sharing an eventIdentifier;
            // v1 syncs only the first occurrence of a series (see README "Known limitations").
            var seen = Set<String>()
            let events = store.events(matching: pred).filter { e in
                guard let id = e.eventIdentifier, !seen.contains(id) else { return false }
                seen.insert(id)
                return true
            }.map(toJson)
            invoke.resolve(["events": events])
        } catch { invoke.reject(error.localizedDescription) }
    }

    @objc func upsertEvent(_ invoke: Invoke) {
        do {
            try requireAccess()
            let a = try invoke.parseArgs(Wrapped<EventArgs>.self).payload
            guard let cal = store.calendar(withIdentifier: a.calendarId) else { throw CalError.noCalendar(a.calendarId) }
            let event: EKEvent
            if let id = a.externalId, let existing = store.event(withIdentifier: id) {
                event = existing
            } else {
                event = EKEvent(eventStore: store)
            }
            event.calendar = cal
            event.title = a.title
            event.notes = a.notes
            event.location = a.location
            event.isAllDay = a.allDay
            event.startDate = try parseDate(a.start)
            event.endDate = try parseDate(a.end)
            try store.save(event, span: .thisEvent, commit: true)
            invoke.resolve(toJson(event))
        } catch { invoke.reject(error.localizedDescription) }
    }

    @objc func deleteEvent(_ invoke: Invoke) {
        do {
            try requireAccess()
            let a = try invoke.parseArgs(Wrapped<DeleteArgs>.self).payload
            // Already gone is success: deletes must be idempotent.
            if let event = store.event(withIdentifier: a.externalId) {
                try store.remove(event, span: .thisEvent, commit: true)
            }
            invoke.resolve()
        } catch { invoke.reject(error.localizedDescription) }
    }
}

@_cdecl("init_plugin_eventkit")
func initPlugin() -> Plugin {
    return EventKitPlugin()
}
