import SwiftUI

struct AnalyticsView: View {
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
                        Text("Аналитика")
                            .font(.system(size: 32, weight: .bold, design: .rounded))
                            .frame(maxWidth: .infinity, alignment: .leading)
                            .padding(.horizontal)
                        
                        VStack(spacing: 12) {
                            analyticsCard(title: "Состояние", value: "4.2", subtitle: "Средняя оценка за неделю")
                            analyticsCard(title: "Лекарства", value: "12", subtitle: "Приемов за неделю")
                            analyticsCard(title: "Питание", value: "21", subtitle: "Кормлений за неделю")
                        }
                        .padding(.horizontal)
                    }
                    .padding(.top)
                }
            }
            .navigationBarTitleDisplayMode(.inline)
        }
    }
    
    private func analyticsCard(title: String, value: String, subtitle: String) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            Text(title)
                .font(.system(size: 16, weight: .semibold, design: .rounded))
                .foregroundColor(.gray)
            
            Text(value)
                .font(.system(size: 48, weight: .bold, design: .rounded))
            
            Text(subtitle)
                .font(.system(size: 14, design: .rounded))
                .foregroundColor(.gray)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(20)
        .background(
            RoundedRectangle(cornerRadius: 32)
                .fill(.white.opacity(0.6))
                .background(.ultraThinMaterial)
                .overlay(
                    RoundedRectangle(cornerRadius: 32)
                        .stroke(.white.opacity(0.8), lineWidth: 1)
                )
        )
    }
}

#Preview {
    AnalyticsView()
}
