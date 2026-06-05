import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";

const app = express();
const PORT = 3000;

app.use(express.json());

// API endpoint for chatbot helper "Lan"
app.post("/api/chat", async (req, res) => {
  const { message, history } = req.body;
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return res.status(500).json({ 
      error: "A chave API GEMINI_API_KEY não está configurada no servidor. Por favor, adicione-a em Configurações > Segredos." 
    });
  }

  try {
    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });

    // Formulate a thorough context prompt for Lan
    const systemInstruction = `Você é a Lan, uma assistente virtual de inteligência artificial de ajuda, integrada ao Sistema de Gerenciamento de Quartos e Reservas do Hotel (PMS - Property Management System).
Seu objetivo principal é dar assistência, suporte e sanar dúvidas de colaboradores (recepcionistas, gerentes e equipe de limpeza) que tenham dificuldades ao utilizar o sistema.

Informações importantes sobre as funcionalidades do sistema para você orientar os usuários:
1. Painel Inicial (Dashboard): Mostra as principais estatísticas: Ocupação (unidades ocupadas/total), Check-ins de hoje, Receita do mês corrente, e quantidade de Quartos aguardando limpeza.
2. Gerenciamento de Quartos:
   - Os quartos possuem status diferente: Livre (AVAILABLE), Reservado/VIP (OCCUPIED), Limpeza (CLEANING), Manutenção (MAINTENANCE).
   - "Realizar Check-in" pode ser feito em quartos livres (AVAILABLE). Se houver uma reserva futura hoje para esse quarto, o sistema sugere associar automaticamente.
   - "Finalizar Experiência" (Check-out) é feito em quartos ocupados (OCCUPIED). Ele abre a tela de pagamento e consumo final e move o quarto para 'Limpeza'.
   - "Liberar Quarto" é feito em quartos em limpeza (CLEANING) para torná-los 'Livres' novamente após o serviço.
3. Alerta de Limpeza e Tempo Limite:
   - Quartos que entram em 'Limpeza' (CLEANING) possuem um cronômetro regressivo visual de 60 minutos.
   - Se a limpeza exceder 60 minutos, ela pisca em vermelho sinalizando "Atrasado" ou "Atraso Crítico". O botão "Liberar Quarto" fica vermelho-destaque para chamar a atenção da equipe.
4. Lançamento de Consumos e Produtos:
   - Para adicionar produtos consumidos pelo hóspede (frigobar, etc.), clique no item em si ou clique para gerenciar consumos.
   - O menu de produtos permite cadastrar novos produtos no sistema (nome, preço, quantidade em estoque).
5. Seção de Clientes (Hóspedes): Permite cadastrar e ver detalhes de todos os hóspedes da base de dados.
6. Seção Financeira (Tab 'Financeiro'):
   - Permite filtrar a receita e faturamento do período por Mês de Referência e por Ano.
   - Gráfico de colunas mostra a receita dividida pelos 12 meses do ano selecionado. Clicar em uma coluna filtra as reservas daquele mês específico.
   - Botão "Exportar" permite baixar em formato CSV toda a relação financeira das reservas do período filtrado.
7. Linha do Tempo (Schedule / Timeline): Visão de calendário horizontal para planejar e ver as reservas ao longo dos dias do mês.

Diretrizes de Tom e Comportamento:
- Seja sempre muito amigável, prestativa, concisa, objetiva e profissional.
- Responda SEMPRE em português brasileiro (PT-BR).
- Forneça respostas curtas e fáceis de ler por pessoas que estão trabalhando em turnos de hotelaria movimentados. Use tópicos marcadores e negritos para realçar termos cruciais da interface.
- Caso o usuário faça perguntas não relacionadas à hotelaria ou fora do escopo deste PMS, retorne-o gentilmente ao objetivo do sistema e ofereça ajuda com as operações do hotel.`;

    // Process chat history into Gemini content formats
    interface ChatMessageParam {
      role: 'user' | 'model';
      parts: Array<{ text: string }>;
    }

    interface HistoryMessage {
      role: string;
      content?: string;
      text?: string;
    }

    const contents: ChatMessageParam[] = [];
    
    if (Array.isArray(history)) {
      (history as HistoryMessage[]).forEach((msg) => {
        contents.push({
          role: msg.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: msg.content || msg.text || '' }]
        });
      });
    }
    
    // Append current message
    contents.push({
      role: 'user',
      parts: [{ text: message }]
    });

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents,
      config: {
        systemInstruction,
        temperature: 0.7,
      },
    });

    res.json({ text: response.text });
  } catch (error) {
    const err = error as Error;
    console.error("Gemini API Error:", err);
    res.status(500).json({ error: err.message || "Erro interno do servidor ao consultar a inteligência artificial." });
  }
});

// Serve assets and setup Vite development server/fallback in production
async function start() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

start();
