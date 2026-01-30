import Foundation

class SupabaseService {
    static let shared = SupabaseService()
    
    private let supabaseURL = "YOUR_SUPABASE_URL"
    private let supabaseKey = "YOUR_SUPABASE_ANON_KEY"
    
    private init() {}
    
    // MARK: - Auth
    func signIn(email: String, password: String) async throws -> User {
        fatalError("Not implemented")
    }
    
    func signUp(email: String, password: String) async throws -> User {
        fatalError("Not implemented")
    }
    
    func signOut() async throws {
    }
    
    // MARK: - Pets
    func fetchPets(userId: UUID) async throws -> [Pet] {
        return []
    }
    
    func createPet(_ pet: Pet) async throws -> Pet {
        fatalError("Not implemented")
    }
    
    // MARK: - Entries
    func fetchStateEntries(petId: UUID, date: String) async throws -> [StateEntry] {
        return []
    }
    
    func fetchMedicationEntries(petId: UUID, date: String) async throws -> [MedicationEntry] {
        return []
    }
    
    func fetchFeedingEntries(petId: UUID, date: String) async throws -> [FeedingEntry] {
        return []
    }
    
    func fetchSymptomEntries(petId: UUID, date: String) async throws -> [SymptomEntry] {
        return []
    }
}

struct User: Codable {
    let id: UUID
    let email: String
}
