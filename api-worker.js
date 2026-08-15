const STUDENTS = ["Janko", "Marienka", "Zuzka"];
const TEACHER_PIN = "2468";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {"Content-Type":"application/json; charset=utf-8","Cache-Control":"no-store",...corsHeaders},
  });
}

function validTestId(value) {
  return typeof value === "string" && /^[a-z0-9-]{1,50}$/.test(value);
}

function key(testId, student) {
  return `test:${testId}:student:${student}`;
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (request.method === "OPTIONS") return new Response(null,{status:204,headers:corsHeaders});

    if (url.pathname === "/submit" && request.method === "POST") {
      try {
        const body = await request.json();
        if (!validTestId(body.testId)) return json({error:"Neplatný test"},400);
        if (!STUDENTS.includes(body.student)) return json({error:"Neznámy žiak"},400);
        const result = {
          testId: body.testId,
          student: body.student,
          score: Number(body.score),
          total: Number(body.total),
          answers: Array.isArray(body.answers) ? body.answers : [],
          submittedAt: body.submittedAt || new Date().toISOString(),
        };
        await env.RESULTS.put(key(body.testId, body.student), JSON.stringify(result));
        return json({ok:true});
      } catch (e) { return json({error:"Neplatné dáta"},400); }
    }

    if (url.pathname === "/results" && request.method === "GET") {
      const testId = url.searchParams.get("testId");
      if (!validTestId(testId)) return json({error:"Neplatný test"},400);
      const result = {};
      for (const name of STUDENTS) {
        const value = await env.RESULTS.get(key(testId, name), "json");
        if (value) result[name] = value;
      }
      return json(result);
    }

    if (url.pathname === "/reset" && request.method === "POST") {
      try {
        const body = await request.json();
        if (body.pin !== TEACHER_PIN) return json({error:"Nesprávny PIN"},403);
        if (!validTestId(body.testId)) return json({error:"Neplatný test"},400);
        for (const name of STUDENTS) await env.RESULTS.delete(key(body.testId, name));
        return json({ok:true});
      } catch (e) { return json({error:"Neplatná požiadavka"},400); }
    }

    return json({ok:true,service:"matematika-vysledky-api"});
  },
};