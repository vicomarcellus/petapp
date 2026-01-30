import Foundation

struct Pet: Identifiable, Codable {
    let id: UUID
    var name: String
    var species: String
    var breed: String?
    var birthDate: Date?
    var avatarUrl: String?
    var userId: UUID
    var createdAt: Date
    
    enum CodingKeys: String, CodingKey {
        case id
        case name
        case species
        case breed
        case birthDate = "birth_date"
        case avatarUrl = "avatar_url"
        case userId = "user_id"
        case createdAt = "created_at"
    }
}
