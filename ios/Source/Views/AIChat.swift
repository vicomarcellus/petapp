import SwiftUI

struct AIChat: View {
    @State private var messages: [ChatMessage] = []
    @State private var inputText = ""
    
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
                
                VStack(spacing: 0) {
                    ScrollView {
                        LazyVStack(spacing: 12) {
                            ForEach(messages) { message in
                                MessageBubble(message: message)
                            }
                        }
                        .padding()
                    }
                    
                    HStack(spacing: 12) {
                        TextField("Спросите что-нибудь...", text: $inputText)
                            .padding(12)
                            .background(
                                RoundedRectangle(cornerRadius: 20)
                                    .fill(.white.opacity(0.6))
                                    .background(.ultraThinMaterial)
                            )
                        
                        Button(action: sendMessage) {
                            Image(systemName: "arrow.up.circle.fill")
                                .font(.system(size: 32))
                                .foregroundColor(.black)
                        }
                        .disabled(inputText.isEmpty)
                    }
                    .padding()
                }
            }
            .navigationTitle("AI Чат")
            .navigationBarTitleDisplayMode(.inline)
        }
    }
    
    private func sendMessage() {
        guard !inputText.isEmpty else { return }
        
        let userMessage = ChatMessage(text: inputText, isUser: true)
        messages.append(userMessage)
        inputText = ""
    }
}

struct ChatMessage: Identifiable {
    let id = UUID()
    let text: String
    let isUser: Bool
}

struct MessageBubble: View {
    let message: ChatMessage
    
    var body: some View {
        HStack {
            if message.isUser { Spacer() }
            
            Text(message.text)
                .font(.system(size: 16, design: .rounded))
                .padding(12)
                .background(
                    RoundedRectangle(cornerRadius: 20)
                        .fill(message.isUser ? Color.black : .white.opacity(0.6))
                )
                .foregroundColor(message.isUser ? .white : .black)
            
            if !message.isUser { Spacer() }
        }
    }
}

#Preview {
    AIChat()
}
