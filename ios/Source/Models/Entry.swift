import Foundation

// MARK: - State Entry
struct StateEntry: Identifiable, Codable {
    let id: UUID
    var date: String
    var time: String
    var timestamp: Int64
    var stateScore: Int
    var note: String?
    var petId: UUID
    var userId: UUID
    
    enum CodingKeys: String, CodingKey {
        case id, date, time, timestamp, note
        case stateScore = "state_score"
        case petId = "pet_id"
        case userId = "user_id"
    }
}

// MARK: - Symptom Entry
struct SymptomEntry: Identifiable, Codable {
    let id: UUID
    var date: String
    var time: String
    var timestamp: Int64
    var symptom: String
    var note: String?
    var petId: UUID
    var userId: UUID
    
    enum CodingKeys: String, CodingKey {
        case id, date, time, timestamp, symptom, note
        case petId = "pet_id"
        case userId = "user_id"
    }
}

// MARK: - Medication Entry
struct MedicationEntry: Identifiable, Codable {
    let id: UUID
    var date: String
    var time: String
    var timestamp: Int64
    var medicationName: String
    var dosage: String
    var isScheduled: Bool
    var completed: Bool
    var scheduledTime: Int64?
    var petId: UUID
    var userId: UUID
    
    enum CodingKeys: String, CodingKey {
        case id, date, time, timestamp, dosage, completed
        case medicationName = "medication_name"
        case isScheduled = "is_scheduled"
        case scheduledTime = "scheduled_time"
        case petId = "pet_id"
        case userId = "user_id"
    }
}

// MARK: - Feeding Entry
struct FeedingEntry: Identifiable, Codable {
    let id: UUID
    var date: String
    var time: String
    var timestamp: Int64
    var foodName: String
    var amount: String
    var unit: FoodUnit
    var note: String?
    var isScheduled: Bool
    var completed: Bool
    var scheduledTime: Int64?
    var petId: UUID
    var userId: UUID
    
    enum CodingKeys: String, CodingKey {
        case id, date, time, timestamp, amount, unit, note, completed
        case foodName = "food_name"
        case isScheduled = "is_scheduled"
        case scheduledTime = "scheduled_time"
        case petId = "pet_id"
        case userId = "user_id"
    }
}

enum FoodUnit: String, Codable, CaseIterable {
    case g, ml, none
    
    var displayName: String {
        switch self {
        case .g: return "г"
        case .ml: return "мл"
        case .none: return "-"
        }
    }
}
