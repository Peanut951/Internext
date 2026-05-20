import {
  createSession,
  createSessionCookie,
  createUserAccount,
  sendJson,
} from "./_shared.js";

type SignupBody = {
  firstName?: string;
  lastName?: string;
  email?: string;
  password?: string;
  phone?: string;
  company?: string;
};

export default async function handler(
  req: {
    method?: string;
    body?: string | SignupBody;
  },
  res: {
    statusCode?: number;
    setHeader: (name: string, value: string) => void;
    end: (chunk?: string) => void;
  },
) {
  if (req.method !== "POST") {
    return sendJson(res, 405, { message: "Method not allowed." });
  }

  let body: SignupBody | undefined;
  if (typeof req.body === "string") {
    try {
      body = JSON.parse(req.body) as SignupBody;
    } catch {
      return sendJson(res, 400, { message: "Invalid request body." });
    }
  } else {
    body = req.body;
  }

  const result = await createUserAccount({
    firstName: String(body?.firstName || ""),
    lastName: String(body?.lastName || ""),
    email: String(body?.email || ""),
    password: String(body?.password || ""),
    phone: String(body?.phone || ""),
    company: String(body?.company || ""),
  });

  if (!result.ok) {
    return sendJson(res, 400, { message: result.message });
  }

  const session = createSession(result.userId, result.email, result.role);
  res.setHeader("Set-Cookie", createSessionCookie(session));

  return sendJson(res, 200, { session });
}
