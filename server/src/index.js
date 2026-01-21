import express from "express";
import cors from "cors";
import { z } from "zod";
import db from "./db.js";
import { loadAllData } from "./data.js";

const app = express();
const port = process.env.PORT || 3001;
const openAIBaseUrl = process.env.OPENAI_BASE_URL || "https://api.openai.com/v1";
const openAIKey = process.env.OPENAI_API_KEY;
const openAIModel = process.env.OPENAI_MODEL || "gpt-4o-mini";
const openAIEnabled = Boolean(openAIKey);

app.use(cors());
app.use(express.json());

const chatRequestSchema = z.object({
  conversationId: z.number().int().optional(),
  message: z.string().min(1)
});

const reportSchema = z.object({
  conversationId: z.number().int(),
  title: z.string().min(1),
  content: z.string().min(1)
});

const conversationSchema = z.object({
  title: z.string().min(1)
});

const {
  invoices: invoiceData,
  invoiceLines,
  shifts,
  leaves,
  bankHolidays,
  sites,
  entities,
  employees,
  businessDates,
  employeeEntities,
  employeeSites
} = await loadAllData();

const buildSalesSummary = (message) => {
  const lowered = message.toLowerCase();
  const restaurants = Array.from(
    new Set(invoiceData.map((row) => row.site_name))
  );

  const matchedRestaurant = restaurants.find((name) =>
    lowered.includes(name.toLowerCase())
  );

  if (lowered.includes("top") || lowered.includes("best")) {
    const rows = restaurants
      .map((name) => {
        const total = invoiceData
          .filter((row) => row.site_name === name)
          .reduce((sum, row) => sum + row.invoice_totals.gross, 0);
        return { restaurant_name: name, total };
      })
      .sort((a, b) => b.total - a.total)
      .slice(0, 3);
    const lines = rows
      .map((row, index) => `${index + 1}. ${row.restaurant_name} - $${row.total.toFixed(2)}`)
      .join("\n");
    return `Here are the top performers by total revenue:\n${lines}`;
  }

  if (matchedRestaurant) {
    const restaurantRows = invoiceData.filter(
      (row) => row.site_name === matchedRestaurant
    );
    const total = restaurantRows.reduce(
      (sum, row) => sum + row.invoice_totals.gross,
      0
    );
    const average = restaurantRows.length ? total / restaurantRows.length : 0;
    return `Summary for ${matchedRestaurant}: total revenue $${total.toFixed(
      2
    )}, average daily revenue $${average.toFixed(2)}.`;
  }

  const totalRevenue = invoiceData.reduce(
    (sum, row) => sum + row.invoice_totals.gross,
    0
  );
  const averageRevenue = invoiceData.length ? totalRevenue / invoiceData.length : 0;
  return `Overall sales summary: total revenue $${totalRevenue.toFixed(
    2
  )}, average daily revenue $${averageRevenue.toFixed(
    2
  )}. Ask about a specific restaurant for deeper insights.`;
};

const buildSalesContext = () => {
  const restaurants = Array.from(
    new Set(invoiceData.map((row) => row.site_name))
  ).sort();
  const lines = restaurants.map((name) => {
    const rows = invoiceData.filter((row) => row.site_name === name);
    const total = rows.reduce((sum, row) => sum + row.invoice_totals.gross, 0);
    const average = rows.length ? total / rows.length : 0;
    const staffCount = employees.filter((row) => row.site_name === name).length;
    const scheduledShifts = shifts.filter(
      (row) => row.site_name === name
    ).length;
    return `${name}: total $${total.toFixed(2)}, average daily $${average.toFixed(
      2
    )}, staff ${staffCount}, scheduled shifts ${scheduledShifts}`;
  });
  return `Restaurant sales & staff snapshot:\n${lines.join("\n")}`;
};

const createOpenAIConversation = async () => {
  const response = await fetch(`${openAIBaseUrl}/conversations`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${openAIKey}`
    },
    body: JSON.stringify({
      metadata: {
        source: "restaurant-sales-chat"
      }
    })
  });

  if (!response.ok) {
    throw new Error(`OpenAI conversation create failed: ${response.status}`);
  }

  const data = await response.json();
  return data.id;
};

const requestOpenAIResponse = async ({ conversationId, message }) => {
  const salesContext = buildSalesContext();
  const response = await fetch(`${openAIBaseUrl}/responses`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${openAIKey}`
    },
    body: JSON.stringify({
      model: openAIModel,
      input: [
        {
          role: "system",
          content: [
            {
              type: "text",
              text: "You are a helpful assistant answering questions about restaurant sales data."
            }
          ]
        },
        {
          role: "system",
          content: [
            {
              type: "text",
              text: salesContext
            }
          ]
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: message
            }
          ]
        }
      ],
      conversation: conversationId
    })
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`OpenAI response failed: ${response.status} ${errorBody}`);
  }

  const data = await response.json();
  const output = data.output_text || data.output?.[0]?.content?.[0]?.text;
  if (!output) {
    throw new Error("OpenAI response missing output text");
  }
  return output;
};

app.get("/api/restaurants", (_req, res) => {
  const restaurants = Array.from(
    new Set(invoiceData.map((row) => row.site_name))
  ).sort();
  res.json(restaurants);
});

app.get("/api/staff", (_req, res) => {
  res.json({
    employees,
    shifts,
    leaves,
    bankHolidays
  });
});

app.get("/api/employees", (_req, res) => {
  res.json({
    entities: employeeEntities,
    sites: employeeSites,
    employees
  });
});

app.get("/api/invoices", (_req, res) => {
  res.json({
    invoices: invoiceData,
    invoiceLines
  });
});

app.get("/api/sites", (_req, res) => {
  res.json(sites);
});

app.get("/api/entities", (_req, res) => {
  res.json(entities);
});

app.get("/api/business-dates", (_req, res) => {
  res.json(businessDates);
});

app.get("/api/conversations", (_req, res) => {
  const rows = db
    .prepare("SELECT id, title, created_at FROM conversations ORDER BY created_at DESC")
    .all();
  res.json(rows);
});

app.post("/api/conversations", async (req, res) => {
  const parsed = conversationSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }

  let openAIConversationId = null;
  if (openAIEnabled) {
    try {
      openAIConversationId = await createOpenAIConversation();
    } catch (error) {
      openAIConversationId = null;
    }
  }

  const result = db
    .prepare("INSERT INTO conversations (title, openai_conversation_id) VALUES (?, ?)")
    .run(parsed.data.title, openAIConversationId);
  const conversation = db
    .prepare("SELECT id, title, created_at FROM conversations WHERE id = ?")
    .get(result.lastInsertRowid);
  res.status(201).json(conversation);
});

app.get("/api/conversations/:id/messages", (req, res) => {
  const id = Number(req.params.id);
  const rows = db
    .prepare(
      "SELECT id, conversation_id, role, content, created_at FROM messages WHERE conversation_id = ? ORDER BY created_at"
    )
    .all(id);
  res.json(rows);
});

app.post("/api/chat", async (req, res) => {
  const parsed = chatRequestSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }

  const { conversationId, message } = parsed.data;
  let activeConversationId = conversationId;
  let openAIConversationId = null;

  if (!activeConversationId) {
    if (openAIEnabled) {
      try {
        openAIConversationId = await createOpenAIConversation();
      } catch (error) {
        openAIConversationId = null;
      }
    }

    const created = db
      .prepare("INSERT INTO conversations (title, openai_conversation_id) VALUES (?, ?)")
      .run(`Sales Chat ${new Date().toLocaleDateString()}`, openAIConversationId);
    activeConversationId = Number(created.lastInsertRowid);
  } else if (openAIEnabled) {
    const conversationRow = db
      .prepare("SELECT openai_conversation_id FROM conversations WHERE id = ?")
      .get(activeConversationId);
    openAIConversationId = conversationRow?.openai_conversation_id ?? null;

    if (!openAIConversationId) {
      try {
        openAIConversationId = await createOpenAIConversation();
        db.prepare("UPDATE conversations SET openai_conversation_id = ? WHERE id = ?").run(
          openAIConversationId,
          activeConversationId
        );
      } catch (error) {
        openAIConversationId = null;
      }
    }
  }

  db.prepare(
    "INSERT INTO messages (conversation_id, role, content) VALUES (?, ?, ?)"
  ).run(activeConversationId, "user", message);

  let assistantReply = buildSalesSummary(message);
  if (openAIEnabled && openAIConversationId) {
    try {
      assistantReply = await requestOpenAIResponse({
        conversationId: openAIConversationId,
        message
      });
    } catch (error) {
      assistantReply = `${assistantReply}\n\n(Note: OpenAI response unavailable; using local summary.)`;
    }
  }
  db.prepare(
    "INSERT INTO messages (conversation_id, role, content) VALUES (?, ?, ?)"
  ).run(activeConversationId, "assistant", assistantReply);

  res.json({ conversationId: activeConversationId, reply: assistantReply });
});

app.get("/api/reports", (_req, res) => {
  const rows = db
    .prepare(
      "SELECT id, conversation_id, title, content, created_at FROM reports ORDER BY created_at DESC"
    )
    .all();
  res.json(rows);
});

app.post("/api/reports", (req, res) => {
  const parsed = reportSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }

  const { conversationId, title, content } = parsed.data;
  const result = db
    .prepare("INSERT INTO reports (conversation_id, title, content) VALUES (?, ?, ?)")
    .run(conversationId, title, content);
  const report = db
    .prepare(
      "SELECT id, conversation_id, title, content, created_at FROM reports WHERE id = ?"
    )
    .get(result.lastInsertRowid);
  res.status(201).json(report);
});

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
