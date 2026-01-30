import SwiftUI

struct SettingsView: View {
    var body: some View {
        NavigationStack {
            ZStack {
                LinearGradient(
                    colors: [
                        Color(red: 0.96, green: 0.96, blue: 0.97),
                        Color(red: 0.96, green: 0.96, blue: 0.95),
                        Color(red: 0.96, green: 0.95, blue: 0.94)
                    ],
                    startPoint: .topLeading,
                    endPoint: .bottomTrailing
                )
                .ignoresSafeArea()
                
                ScrollView {
                    VStack(spacing: 16) {
                        Text("Настройки")
                            .font(.system(size: 32, weight: .bold, design: .rounded))
                            .frame(maxWidth: .infinity, alignment: .leading)
                            .padding(.horizontal)
                        
                        VStack(spacing: 12) {
                            settingsRow(icon: "person.circle", title: "Профиль")
                            settingsRow(icon: "pawprint.fill", title: "Питомцы")
                            settingsRow(icon: "bell.fill", title: "Уведомления")
                            settingsRow(icon: "arrow.clockwise", title: "Резервное копирование")
                            settingsRow(icon: "arrow.right.square", title: "Выход")
                        }
                        .padding(.horizontal)
                    }
                    .padding(.top)
                }
            }
            .navigationBarTitleDisplayMode(.inline)
        }
    }
    
    private func settingsRow(icon: String, title: String) -> some View {
        HStack {
            Image(systemName: icon)
                .font(.title3)
                .foregroundColor(.black)
                .frame(width: 32)
            
            Text(title)
                .font(.system(size: 18, weight: .medium, design: .rounded))
            
            Spacer()
            
            Image(systemName: "chevron.right")
                .foregroundColor(.gray)
        }
        .padding(16)
        .background(
            RoundedRectangle(cornerRadius: 20)
                .fill(.white.opacity(0.6))
                .background(.ultraThinMaterial)
                .overlay(
                    RoundedRectangle(cornerRadius: 20)
                        .stroke(.white.opacity(0.8), lineWidth: 1)
                )
        )
    }
}

#Preview {
    SettingsView()
}
