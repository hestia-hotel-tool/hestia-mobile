import Intents
import UserNotifications

/// Gives every Hestia push its picture on the lock screen (Figma 4443:595).
///
/// iOS draws a "communication" notification with a large picture on the left
/// and the app icon on its corner. This extension runs before the notification
/// is shown, picks the picture — the sender's photo for an announcement or a
/// chat (when the push carries `senderAvatarUrl`), otherwise the coloured
/// picture for its type bundled in `images/` — and turns the notification into
/// a message from a "sender" with that picture. The title the server sent
/// ("Cleaning Started") becomes the sender's name, so the text reads as before.
///
/// Anything that goes wrong leaves the notification exactly as it arrived.
class NotificationService: UNNotificationServiceExtension {
  private var contentHandler: ((UNNotificationContent) -> Void)?
  private var bestAttempt: UNMutableNotificationContent?

  override func didReceive(
    _ request: UNNotificationRequest,
    withContentHandler contentHandler: @escaping (UNNotificationContent) -> Void
  ) {
    self.contentHandler = contentHandler
    guard let content = request.content.mutableCopy() as? UNMutableNotificationContent else {
      contentHandler(request.content)
      return
    }
    bestAttempt = content

    // Expo puts the push's `data` under "body"; fall back to the top level.
    let data = (content.userInfo["body"] as? [String: Any]) ?? (content.userInfo as? [String: Any]) ?? [:]
    let type = (data["type"] as? String) ?? "default"
    let avatarUrl = (data["senderAvatarUrl"] as? String).flatMap { URL(string: $0) }

    loadPicture(type: type, avatarUrl: avatarUrl) { picture in
      guard let picture = picture else {
        contentHandler(content)
        return
      }
      contentHandler(Self.communication(content, type: type, picture: picture) ?? content)
    }
  }

  /// iOS is about to give up on us: show what arrived.
  override func serviceExtensionTimeWillExpire() {
    if let contentHandler = contentHandler, let bestAttempt = bestAttempt {
      contentHandler(bestAttempt)
    }
  }

  // MARK: - Picture

  private func loadPicture(type: String, avatarUrl: URL?, done: @escaping (Data?) -> Void) {
    if let avatarUrl = avatarUrl {
      var request = URLRequest(url: avatarUrl)
      request.timeoutInterval = 8
      URLSession.shared.dataTask(with: request) { data, response, _ in
        let ok = (response as? HTTPURLResponse).map { (200..<300).contains($0.statusCode) } ?? false
        if let data = data, ok, !data.isEmpty {
          done(data)
        } else {
          done(Self.bundledPicture(type: type))
        }
      }.resume()
      return
    }
    done(Self.bundledPicture(type: type))
  }

  private static func bundledPicture(type: String) -> Data? {
    let bundle = Bundle(for: NotificationService.self)
    for name in [type, "default"] {
      if let url = bundle.url(forResource: name, withExtension: "png"),
         let data = try? Data(contentsOf: url) {
        return data
      }
    }
    return nil
  }

  // MARK: - Communication notification

  private static func communication(
    _ content: UNMutableNotificationContent,
    type: String,
    picture: Data
  ) -> UNNotificationContent? {
    let title = content.title.isEmpty ? "Hestia" : content.title
    let sender = INPerson(
      personHandle: INPersonHandle(value: type, type: .unknown),
      nameComponents: nil,
      displayName: title,
      image: INImage(imageData: picture),
      contactIdentifier: nil,
      customIdentifier: type
    )
    let intent = INSendMessageIntent(
      recipients: nil,
      outgoingMessageType: .outgoingMessageText,
      content: content.body,
      speakableGroupName: nil,
      conversationIdentifier: type,
      serviceName: nil,
      sender: sender,
      attachments: nil
    )
    intent.setImage(INImage(imageData: picture), forParameterNamed: \.sender)

    let interaction = INInteraction(intent: intent, response: nil)
    interaction.direction = .incoming
    interaction.donate(completion: nil)

    return try? content.updating(from: intent)
  }
}
