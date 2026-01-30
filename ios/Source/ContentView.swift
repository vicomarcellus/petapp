import SwiftUI

struct ContentView: View {
    @State private var selectedTab = 0
    
    var body: some View {
        TabView(selection: $selectedTab) {
            CalendarView()
                .tabItem {
                    Label("Календарь", systemImage: "calendar")
                }
                .tag(0)
            
            AnalyticsView()
                .tabItem {
                    Label("Аналитика", systemImage: "chart.bar")
                }
                .tag(1)
            
            AIChat()
                .tabItem {
                    Label("AI Чат", systemImage: "message")
                }
                .tag(2)
            
            SettingsView()
                .tabItem {
                    Label("Настройки", systemImage: "gearshape")
                }
                .tag(3)
        }
    }
}

#Preview {
    ContentView()
}
