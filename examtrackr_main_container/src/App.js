/* App.js: Main Container for ExamTrackr web app */

import React, { useState, useEffect, useCallback } from "react";
import { supabase } from "./supabaseClient";
import { exportToICS } from "./utils/icsExport";

// --- Color palette
const COLORS = {
  primary: "primary",
  secondary: "secondary",
  accent: "accent",
  urgency: {
    green: "bg-green-300 text-green-900",
    yellow: "bg-yellow-200 text-yellow-900",
    red: "bg-red-400 text-white"
  }
};

function daysUntil(date) {
  const now = new Date();
  const target = new Date(date);
  return Math.ceil((target - now) / (1000 * 60 * 60 * 24));
}

// PUBLIC_INTERFACE
function AuthSection({ user, onSignOut, onSignedIn }) {
  const [loading, setLoading] = useState(false);
  const [view, setView] = useState("signin");
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [error, setError] = useState("");

  // Handle sign in or sign up
  const handleSubmit = async e => {
    e.preventDefault();
    setLoading(true);
    setError("");
    if (view === "signin") {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password: pw
      });
      if (error) setError(error.message);
      else onSignedIn();
    } else {
      const { error } = await supabase.auth.signUp({
        email,
        password: pw
      });
      if (error) setError(error.message);
      else onSignedIn();
    }
    setLoading(false);
  };

  if (user)
    return (
      <div className="flex flex-col items-end">
        <span className="text-sm mr-2">
          Signed in as <b>{user.email}</b>
        </span>
        <button
          className="btn py-1 px-3 mt-1"
          onClick={onSignOut}
          aria-label="Sign out"
        >
          Sign out
        </button>
      </div>
    );

  return (
    <div className="bg-white/80 rounded border px-3 py-2 max-w-xs mx-auto mt-8 shadow-lg">
      <form onSubmit={handleSubmit} className="flex flex-col gap-2">
        <h3 className="font-bold text-primary">{view === "signin" ? "Sign In" : "Sign Up"}</h3>
        <input
          className="border rounded px-2 py-1 mt-2"
          placeholder="Email"
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          required
        />
        <input
          className="border rounded px-2 py-1"
          placeholder="Password"
          type="password"
          value={pw}
          onChange={e => setPw(e.target.value)}
          minLength={6}
          required
        />
        {error && <div className="text-red-600 text-xs">{error}</div>}
        <button
          type="submit"
          className="btn btn-primary mt-2"
          disabled={loading}
          aria-busy={loading}
        >
          {loading ? "..." : view === "signin" ? "Sign In" : "Sign Up"}
        </button>
        <div className="text-xs text-center mt-2">
          {view === "signin" ? (
            <>
              New here?{" "}
              <button type="button" onClick={() => setView("signup")} className="underline text-primary">
                Sign Up
              </button>
            </>
          ) : (
            <>
              Already have an account?{" "}
              <button type="button" onClick={() => setView("signin")} className="underline text-primary">
                Sign In
              </button>
            </>
          )}
        </div>
      </form>
    </div>
  );
}

// PUBLIC_INTERFACE
function ThemeToggle({ theme, setTheme }) {
  return (
    <button
      onClick={() => setTheme(theme === "light" ? "dark" : "light")}
      className="rounded px-2 py-1 ml-4"
      aria-label="Toggle light/dark mode"
    >
      {theme === "light" ? "🌙" : "☀️"}
    </button>
  );
}

// PUBLIC_INTERFACE
function ExamCard({
  exam,
  isExpanded,
  onExpand,
  onEdit,
  onDelete,
  onLogGrade,
  onAddMilestone,
  onEditMilestone,
  onDeleteMilestone,
  colorMode
}) {
  const days = daysUntil(exam.date);
  let urgencyClass =
    days > 10
      ? COLORS.urgency.green
      : days > 4
      ? COLORS.urgency.yellow
      : COLORS.urgency.red;

  return (
    <div
      className={`rounded-lg shadow-md p-4 mb-4 cursor-pointer transition-all duration-200 border ${isExpanded ? "bg-secondary/80" : "bg-white/90"}`}
      onClick={() => onExpand(exam.id)}
      tabIndex={0}
      aria-expanded={isExpanded}
    >
      <div className="flex items-center justify-between">
        <div>
          <div className="font-semibold text-lg">{exam.title}</div>
          <div className="text-sm text-gray-600">{exam.subject}</div>
        </div>
        <div className="flex flex-col items-end gap-1">
          <div
            className={`rounded-full px-3 py-1 font-mono text-xs font-bold shadow ${urgencyClass}`}
          >
            {days >= 0 ? `${days}d` : "Ended"}
          </div>
          <span className="text-xs">{new Date(exam.date).toLocaleDateString()}</span>
        </div>
      </div>
      {isExpanded && (
        <div className="mt-4" onClick={e => e.stopPropagation()}>
          <div className="mb-2">
            <b>Milestones:</b>{" "}
            <button className="underline text-accent text-xs ml-2" onClick={() => onAddMilestone(exam.id)}>+ Add</button>
          </div>
          <ul className="mb-2">
            {exam.milestones?.map(milestone => (
              <li key={milestone.id} className="my-1 flex items-center justify-between text-sm">
                <span>
                  {milestone.title} — {milestone.status} <span className="text-xs">({milestone.target_date})</span>
                </span>
                <span>
                  <button className="text-xs underline" onClick={() => onEditMilestone(exam.id, milestone)}>edit</button>
                  <button className="text-xs underline ml-2 text-red-500" onClick={() => onDeleteMilestone(exam.id, milestone.id)}>del</button>
                </span>
              </li>
            ))}
          </ul>
          <div className="flex items-center gap-2">
            {days < 0 && (
              <>
                <button className="btn btn-xs" onClick={() => onLogGrade(exam.id)}>
                  Log grade & reflection
                </button>
              </>
            )}
            <button className="btn btn-xs" onClick={() => onEdit(exam.id)}>Edit</button>
            <button className="btn btn-xs text-red-700" onClick={() => onDelete(exam.id)}>Delete</button>
          </div>
          <div className="mt-2">
            {exam.grade && (
              <div>
                <b>Grade:</b> {exam.grade}
                <div className="text-xs mt-1">{exam.reflection}</div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// PUBLIC_INTERFACE
function ExamsDashboard({
  exams,
  expandedId,
  setExpandedId,
  onAdd,
  onEdit,
  onDelete,
  onLogGrade,
  onAddMilestone,
  onEditMilestone,
  onDeleteMilestone,
  sortBy,
  setSortBy,
  filter,
  setFilter,
  onExport
}) {
  // Sorting
  const sorted = [...exams]
    .sort((a, b) => {
      if (sortBy === "date") {
        return new Date(a.date) - new Date(b.date);
      } else if (sortBy === "subject") {
        return a.subject.localeCompare(b.subject);
      } else {
        return a.title.localeCompare(b.title);
      }
    })
    .filter(
      e =>
        !filter ||
        e.subject.toLowerCase().includes(filter.toLowerCase()) ||
        e.title.toLowerCase().includes(filter.toLowerCase())
    );

  return (
    <div>
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <div className="flex gap-2">
          <button className="btn" onClick={onAdd}>+ Add Exam</button>
          <button className="btn" onClick={onExport}>Export Calendar</button>
        </div>
        <div className="flex gap-2 flex-wrap">
          <select
            className="border rounded px-2 py-1"
            value={sortBy}
            onChange={e => setSortBy(e.target.value)}
          >
            <option value="date">Sort by Date</option>
            <option value="subject">Sort by Subject</option>
            <option value="title">Sort by Title</option>
          </select>
          <input
            className="border rounded px-2 py-1"
            placeholder="Filter…"
            value={filter}
            onChange={e => setFilter(e.target.value)}
          />
        </div>
      </div>
      <div>
        {sorted.map(exam => (
          <ExamCard
            key={exam.id}
            exam={exam}
            isExpanded={expandedId === exam.id}
            onExpand={setExpandedId}
            onEdit={onEdit}
            onDelete={onDelete}
            onLogGrade={onLogGrade}
            onAddMilestone={onAddMilestone}
            onEditMilestone={onEditMilestone}
            onDeleteMilestone={onDeleteMilestone}
          />
        ))}
        {sorted.length === 0 && (
          <div className="text-center text-gray-400 my-8">
            No exams found. Try adding one!
          </div>
        )}
      </div>
    </div>
  );
}

// --- Modal dialog shared component ---
function Modal({ open, onClose, children }) {
  if (!open) return null;
  return (
    <div className="fixed z-30 inset-0 bg-black/30 flex items-center justify-center">
      <div className="bg-white dark:bg-gray-800 p-5 rounded shadow max-w-md w-full relative">
        <button className="absolute top-2 right-2 text-xl" onClick={onClose} aria-label="Close">&times;</button>
        {children}
      </div>
    </div>
  );
}

// --- Exam/Milestone Modal forms ---

function ExamForm({ initial, onSave, onCancel }) {
  const [form, setForm] = useState(
    initial || { title: "", subject: "", date: "", id: undefined }
  );

  return (
    <form
      onSubmit={e => {
        e.preventDefault();
        onSave(form);
      }}
      className="flex flex-col gap-2"
    >
      <label>
        Title:
        <input
          className="input border rounded px-2 py-1 w-full"
          value={form.title}
          onChange={e => setForm({ ...form, title: e.target.value })}
          required
        />
      </label>
      <label>
        Subject:
        <input
          className="input border rounded px-2 py-1 w-full"
          value={form.subject}
          onChange={e => setForm({ ...form, subject: e.target.value })}
          required
        />
      </label>
      <label>
        Date:
        <input
          className="input border rounded px-2 py-1 w-full"
          type="date"
          value={form.date}
          onChange={e => setForm({ ...form, date: e.target.value })}
          required
        />
      </label>
      <div className="flex gap-2 mt-2">
        <button type="submit" className="btn btn-primary">
          Save
        </button>
        <button type="button" className="btn" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </form>
  );
}

function MilestoneForm({ initial, onSave, onCancel }) {
  const [form, setForm] = useState(
    initial || { title: "", target_date: "", status: "pending", id: undefined }
  );

  return (
    <form
      onSubmit={e => {
        e.preventDefault();
        onSave(form);
      }}
      className="flex flex-col gap-2"
    >
      <label>
        Milestone:
        <input
          className="input border rounded px-2 py-1 w-full"
          value={form.title}
          onChange={e => setForm({ ...form, title: e.target.value })}
          required
        />
      </label>
      <label>
        Target Date:
        <input
          className="input border rounded px-2 py-1 w-full"
          type="date"
          value={form.target_date}
          onChange={e => setForm({ ...form, target_date: e.target.value })}
          required
        />
      </label>
      <label>
        Status:
        <select
          className="input border rounded px-2 py-1 w-full"
          value={form.status}
          onChange={e => setForm({ ...form, status: e.target.value })}
        >
          <option value="pending">Pending</option>
          <option value="done">Done</option>
        </select>
      </label>
      <div className="flex gap-2 mt-2">
        <button type="submit" className="btn btn-primary">
          Save
        </button>
        <button type="button" className="btn" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </form>
  );
}

function GradeReflectionForm({ initial, onSave, onCancel }) {
  const [grade, setGrade] = useState(initial?.grade || "");
  const [reflection, setReflection] = useState(initial?.reflection || "");

  return (
    <form
      onSubmit={e => {
        e.preventDefault();
        onSave({ grade, reflection });
      }}
      className="flex flex-col gap-2"
    >
      <label>
        Grade:
        <input
          className="input border rounded px-2 py-1 w-full"
          value={grade}
          onChange={e => setGrade(e.target.value)}
          required
        />
      </label>
      <label>
        Reflection:
        <textarea
          className="input border rounded px-2 py-1 w-full"
          value={reflection}
          onChange={e => setReflection(e.target.value)}
        />
      </label>
      <div className="flex gap-2 mt-2">
        <button type="submit" className="btn btn-primary">
          Save
        </button>
        <button type="button" className="btn" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </form>
  );
}

// --- Main App Container ---
const LOCAL_THEME_KEY = "examtrackr_theme";

function App() {
  const [theme, setTheme] = useState(() =>
    window.matchMedia &&
    window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light"
  );
  const [user, setUser] = useState(null);
  // Format: { id, title, subject, date, milestones: [{id, title, date, ...}], grade, reflection }
  const [exams, setExams] = useState([]);
  const [expandedId, setExpandedId] = useState(null);

  // Modal states
  const [modal, setModal] = useState({ open: false, type: "", examId: null, item: null });

  // Sorting/filtering
  const [sortBy, setSortBy] = useState("date");
  const [filter, setFilter] = useState("");

  // Theme effect and persistence
  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    window.localStorage.setItem(LOCAL_THEME_KEY, theme);
  }, [theme]);

  useEffect(() => {
    const t = window.localStorage.getItem(LOCAL_THEME_KEY);
    if (t) setTheme(t);
  }, []);

  // Auth state
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user || null);
    });
    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null);
    });
    return () => subscription.unsubscribe();
  }, []);

  // Fetch exams for logged in user
  const fetchExams = useCallback(async () => {
    if (!user) return;
    let { data: examsData } = await supabase
      .from("exams")
      .select(
        "id, title, subject, date, grade, reflection, milestones(id, title, target_date, status)"
      )
      .eq("user_id", user.id)
      .order("date", { ascending: true });

    setExams(
      (examsData || []).map(e => ({
        ...e,
        milestones: Array.isArray(e.milestones) ? e.milestones : []
      }))
    );
  }, [user]);

  useEffect(() => {
    fetchExams();
    // Add subscription for live update if desired using supabase.realtime
    // For now, on-demand fetch
  }, [fetchExams, user]);

  // CRUD operations -- real (replace with stub if no backend)
  async function addOrUpdateExam(exam) {
    if (exam.id) {
      await supabase
        .from("exams")
        .update({
          title: exam.title,
          subject: exam.subject,
          date: exam.date
        })
        .eq("id", exam.id)
        .eq("user_id", user.id);
    } else {
      await supabase
        .from("exams")
        .insert({
          title: exam.title,
          subject: exam.subject,
          date: exam.date,
          user_id: user.id
        });
    }
    setModal({ open: false });
    fetchExams();
  }
  async function deleteExam(id) {
    await supabase.from("exams").delete().eq("id", id).eq("user_id", user.id);
    setModal({ open: false });
    fetchExams();
  }
  async function addOrUpdateMilestone(examId, milestone) {
    if (milestone.id) {
      await supabase
        .from("milestones")
        .update({
          title: milestone.title,
          target_date: milestone.target_date,
          status: milestone.status
        })
        .eq("id", milestone.id);
    } else {
      await supabase
        .from("milestones")
        .insert({
          title: milestone.title,
          target_date: milestone.target_date,
          status: milestone.status,
          exam_id: examId
        });
    }
    setModal({ open: false });
    fetchExams();
  }
  async function deleteMilestone(_examId, milestoneId) {
    await supabase.from("milestones").delete().eq("id", milestoneId);
    setModal({ open: false });
    fetchExams();
  }
  async function logGradeReflection(examId, vals) {
    await supabase
      .from("exams")
      .update({ grade: vals.grade, reflection: vals.reflection })
      .eq("id", examId)
      .eq("user_id", user.id);
    setModal({ open: false });
    fetchExams();
  }

  // Modal openers
  function openAddExam() {
    setModal({ open: true, type: "exam", examId: null, item: null });
  }
  function openEditExam(id) {
    const exam = exams.find(e => e.id === id);
    setModal({ open: true, type: "exam", examId: id, item: exam });
  }
  function openLogGrade(id) {
    const exam = exams.find(e => e.id === id);
    setModal({ open: true, type: "grade", examId: id, item: exam });
  }
  function openAddMilestone(examId) {
    setModal({ open: true, type: "milestone", examId, item: null });
  }
  function openEditMilestone(examId, milestone) {
    setModal({ open: true, type: "milestone", examId, item: milestone });
  }

  // Calendar export
  function handleExportCalendar() {
    const events = [];
    for (const exam of exams) {
      events.push({
        title: `EXAM: ${exam.title}`,
        description: `Subject: ${exam.subject}`,
        date: exam.date
      });
      if (Array.isArray(exam.milestones)) {
        for (const ms of exam.milestones) {
          events.push({
            title: `Milestone for ${exam.title}: ${ms.title}`,
            description: `Status: ${ms.status}`,
            date: ms.target_date
          });
        }
      }
    }
    exportToICS(events, "ExamTrackr.ics");
  }

  // App content
  return (
    <div className={`${theme === "dark" ? "dark" : ""} min-h-screen bg-secondary dark:bg-gray-900 text-gray-900 dark:text-gray-100 transition-colors`}>
      <nav className="w-full px-2 py-3 bg-primary dark:bg-gray-900 shadow mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-accent font-semibold text-2xl select-none">ExamTrackr</span>
          <span className="ml-2 text-sm text-white/80">Dashboard</span>
        </div>
        <div className="flex items-center gap-2">
          <ThemeToggle theme={theme} setTheme={setTheme} />
          <AuthSection
            user={user}
            onSignOut={() => supabase.auth.signOut()}
            onSignedIn={fetchExams}
          />
        </div>
      </nav>
      <main className="container mx-auto max-w-2xl px-2 md:px-0">
        {!user ? (
          <div className="my-20">
            <AuthSection user={null} onSignOut={() => {}} onSignedIn={fetchExams} />
          </div>
        ) : (
          <div className="my-5">
            <ExamsDashboard
              exams={exams}
              expandedId={expandedId}
              setExpandedId={id => setExpandedId(id === expandedId ? null : id)}
              onAdd={openAddExam}
              onEdit={openEditExam}
              onDelete={deleteExam}
              onLogGrade={openLogGrade}
              onAddMilestone={openAddMilestone}
              onEditMilestone={openEditMilestone}
              onDeleteMilestone={deleteMilestone}
              sortBy={sortBy}
              setSortBy={setSortBy}
              filter={filter}
              setFilter={setFilter}
              onExport={handleExportCalendar}
            />
          </div>
        )}
      </main>
      {/* Modal for Add/Edit Exam */}
      <Modal open={modal.open && modal.type === "exam"} onClose={() => setModal({ open: false })}>
        <ExamForm
          initial={modal.item}
          onSave={addOrUpdateExam}
          onCancel={() => setModal({ open: false })}
        />
      </Modal>
      {/* Modal for Add/Edit Milestone */}
      <Modal open={modal.open && modal.type === "milestone"} onClose={() => setModal({ open: false })}>
        <MilestoneForm
          initial={modal.item}
          onSave={vals => addOrUpdateMilestone(modal.examId, vals)}
          onCancel={() => setModal({ open: false })}
        />
      </Modal>
      {/* Modal for Grade/Reflection */}
      <Modal open={modal.open && modal.type === "grade"} onClose={() => setModal({ open: false })}>
        <GradeReflectionForm
          initial={modal.item}
          onSave={vals => logGradeReflection(modal.examId, vals)}
          onCancel={() => setModal({ open: false })}
        />
      </Modal>
      <footer className="w-full p-4 text-center text-xs text-gray-400 mt-8">Made for students &mdash; ExamTrackr 2024</footer>
    </div>
  );
}

export default App;
