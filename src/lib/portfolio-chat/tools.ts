import { Type, type FunctionDeclaration } from "@google/genai";
import { FIELD_DEFS, FIELD_IDS } from "./fields";

// Tool names referenced by the route's dispatch logic.
export const TOOL = {
  listPortfolio: "listPortfolio",
  getProperty: "getProperty",
  readPropertyDocuments: "readPropertyDocuments",
  proposePropertyFieldChange: "proposePropertyFieldChange",
} as const;

// Human-readable catalogue of editable fields, embedded in the propose tool's
// description so the model can map natural language → the right field id.
const FIELD_CATALOGUE = FIELD_DEFS.map((f) => `- "${f.id}": ${f.description}`).join("\n");

// Read tools are auto-executed server-side during the stream (RLS-scoped, safe).
// The propose tool is NEVER executed by the model — when it's called the route
// emits a confirmation proposal and stops; the real write happens only after the
// user accepts, through a separate authorized server action.
export const FUNCTION_DECLARATIONS: FunctionDeclaration[] = [
  {
    name: TOOL.listPortfolio,
    description:
      "List the user's properties with their id, name and key financial inputs. The portfolio summary is already provided in the system prompt, so usually you do not need this; call it only to refresh the data.",
  },
  {
    name: TOOL.getProperty,
    description:
      "Get the full financial inputs for a single property by its id. Use when you need a detail not present in the portfolio summary.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        propertyId: { type: Type.STRING, description: "The property's id (from the portfolio summary)." },
      },
      required: ["propertyId"],
    },
  },
  {
    name: TOOL.readPropertyDocuments,
    description:
      "Read the uploaded documents (purchase contract, rental agreement, loan agreement, etc.) of a property to answer a question that requires their contents. Only call this when the user's question genuinely needs information from the documents, since it is slower and more expensive.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        propertyId: { type: Type.STRING, description: "The property's id whose documents to read." },
        question: {
          type: Type.STRING,
          description: "The specific question to answer from the documents, in the user's language.",
        },
      },
      required: ["propertyId", "question"],
    },
  },
  {
    name: TOOL.proposePropertyFieldChange,
    description:
      `Propose changing ONE financial field of ONE property. This does NOT apply the change — it shows the user a confirmation card and the change is only saved if they accept. Use this whenever the user asks to set, change, update or correct a value. Choose the single best-matching field id from this list:\n${FIELD_CATALOGUE}\nPercent fields take the percentage as a plain number (e.g. 5 for 5%). Euro fields take the amount in euros. After proposing, briefly tell the user what you are proposing and that they can confirm it.`,
    parameters: {
      type: Type.OBJECT,
      properties: {
        propertyId: { type: Type.STRING, description: "The id of the property to change." },
        field: {
          type: Type.STRING,
          enum: FIELD_IDS,
          description: "The field id to change (must be one of the listed ids).",
        },
        newValue: { type: Type.NUMBER, description: "The new numeric value." },
      },
      required: ["propertyId", "field", "newValue"],
    },
  },
];
