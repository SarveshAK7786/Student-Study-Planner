const API_BASE = '/api';

function getAuthHeader() {
  const token = sessionStorage.getItem('study_token') || localStorage.getItem('study_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function handleResponse(response) {
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || `HTTP error ${response.status}`);
  }
  return data;
}

export const api = {
  // System Health & DB status
  async getHealth() {
    const res = await fetch(`${API_BASE}/health`);
    return handleResponse(res);
  },

  // Auth
  async register(userData) {
    const res = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userData),
    });
    return handleResponse(res);
  },

  async login(credentials) {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(credentials),
    });
    return handleResponse(res);
  },

  async googleLogin(profileData) {
    const res = await fetch(`${API_BASE}/auth/google`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(profileData),
    });
    return handleResponse(res);
  },

  async getMe() {
    const res = await fetch(`${API_BASE}/auth/me`, {
      headers: { ...getAuthHeader() },
    });
    return handleResponse(res);
  },

  async linkParent(linkData) {
    const res = await fetch(`${API_BASE}/auth/link-parent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify(linkData),
    });
    return handleResponse(res);
  },

  // Courses
  async getCourses(studentId = null) {
    const url = studentId ? `${API_BASE}/courses?student_id=${studentId}` : `${API_BASE}/courses`;
    const res = await fetch(url, { headers: { ...getAuthHeader() } });
    return handleResponse(res);
  },

  async createCourse(courseData) {
    const res = await fetch(`${API_BASE}/courses`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify(courseData),
    });
    return handleResponse(res);
  },

  async deleteCourse(courseId) {
    const res = await fetch(`${API_BASE}/courses/${courseId}`, {
      method: 'DELETE',
      headers: { ...getAuthHeader() },
    });
    return handleResponse(res);
  },

  // Study Plans
  async getStudyPlans(params = {}) {
    const query = new URLSearchParams(params).toString();
    const res = await fetch(`${API_BASE}/study-plans?${query}`, {
      headers: { ...getAuthHeader() },
    });
    return handleResponse(res);
  },

  async updatePlanStatus(planId, status, notesSnippet = '') {
    const res = await fetch(`${API_BASE}/study-plans/${planId}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify({ status, notes_snippet: notesSnippet }),
    });
    return handleResponse(res);
  },

  // Study Hub (Topic Notes & Practice Questions)
  async getStudyHub(planId) {
    const res = await fetch(`${API_BASE}/study-plans/${planId}/study-hub`, {
      headers: { ...getAuthHeader() },
    });
    return handleResponse(res);
  },

  // Assignments
  async getAssignments(params = {}) {
    const query = new URLSearchParams(params).toString();
    const res = await fetch(`${API_BASE}/assignments?${query}`, {
      headers: { ...getAuthHeader() },
    });
    return handleResponse(res);
  },

  async completeAssignment(id, data = {}) {
    const res = await fetch(`${API_BASE}/assignments/${id}/complete`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify(data),
    });
    return handleResponse(res);
  },

  async evaluateAssignment(assignmentId, { file = null, submissionText = '' }) {
    if (file) {
      const formData = new FormData();
      formData.append('document', file);
      if (submissionText) formData.append('submission_text', submissionText);
      const res = await fetch(`${API_BASE}/assignments/${assignmentId}/evaluate`, {
        method: 'POST',
        headers: { ...getAuthHeader() },
        body: formData,
      });
      return handleResponse(res);
    } else {
      const res = await fetch(`${API_BASE}/assignments/${assignmentId}/evaluate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
        body: JSON.stringify({ submission_text: submissionText }),
      });
      return handleResponse(res);
    }
  },

  async getAssignmentPractice(assignmentId) {
    const res = await fetch(`${API_BASE}/assignments/${assignmentId}/practice-questions`, {
      headers: { ...getAuthHeader() },
    });
    return handleResponse(res);
  },

  async createAssignment(assignmentData) {
    const res = await fetch(`${API_BASE}/assignments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify(assignmentData),
    });
    return handleResponse(res);
  },

  // Quizzes & Tests
  async getTests(studentId = null) {
    const url = studentId ? `${API_BASE}/tests?student_id=${studentId}` : `${API_BASE}/tests`;
    const res = await fetch(url, { headers: { ...getAuthHeader() } });
    return handleResponse(res);
  },

  async getTestDetails(testId) {
    const res = await fetch(`${API_BASE}/tests/${testId}`, {
      headers: { ...getAuthHeader() },
    });
    return handleResponse(res);
  },

  async submitTest(testId, answers) {
    const res = await fetch(`${API_BASE}/tests/${testId}/submit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify({ answers }),
    });
    return handleResponse(res);
  },

  async generateAiQuiz(courseId, topicTitle) {
    const res = await fetch(`${API_BASE}/tests/generate-ai`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify({ course_id: courseId, topic_title: topicTitle }),
    });
    return handleResponse(res);
  },

  // AI Notes
  async getNotes(courseId = null, studentId = null) {
    const params = new URLSearchParams();
    if (courseId) params.append('course_id', courseId);
    if (studentId) params.append('student_id', studentId);
    const res = await fetch(`${API_BASE}/notes?${params.toString()}`, {
      headers: { ...getAuthHeader() },
    });
    return handleResponse(res);
  },

  async generateNotes(courseId, topic, difficulty = 'medium') {
    const res = await fetch(`${API_BASE}/notes/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify({ course_id: courseId, topic, difficulty }),
    });
    return handleResponse(res);
  },

  async deleteNote(noteId) {
    const res = await fetch(`${API_BASE}/notes/${noteId}`, {
      method: 'DELETE',
      headers: { ...getAuthHeader() },
    });
    return handleResponse(res);
  },

  // AI Study Chatbot
  async sendChatMessage(messages, activeCourseId = null, extraConfig = {}) {
    const res = await fetch(`${API_BASE}/chatbot/message`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify({ 
        messages, 
        active_course_id: activeCourseId,
        ...extraConfig
      }),
    });
    return handleResponse(res);
  },

  async getAiConfig() {
    const res = await fetch(`${API_BASE}/chatbot/config`, {
      headers: { ...getAuthHeader() },
    });
    return handleResponse(res);
  },

  async saveAiKey(provider, apiKey, model = null) {
    const res = await fetch(`${API_BASE}/chatbot/save-key`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify({ provider, apiKey, model }),
    });
    return handleResponse(res);
  },

  async testAiConnection(provider, apiKey, model = null) {
    const res = await fetch(`${API_BASE}/chatbot/test-connection`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify({ provider, apiKey, model }),
    });
    return handleResponse(res);
  },

  // Document Study Notes Generator
  async uploadDocForNotes(file, noteTitle = '', extraConfig = {}) {
    const formData = new FormData();
    formData.append('document', file);
    if (noteTitle) formData.append('note_title', noteTitle);
    if (extraConfig.provider) formData.append('provider', extraConfig.provider);
    if (extraConfig.apiKey) formData.append('apiKey', extraConfig.apiKey);
    if (extraConfig.model) formData.append('model', extraConfig.model);

    const res = await fetch(`${API_BASE}/doc-notes/generate`, {
      method: 'POST',
      headers: { ...getAuthHeader() },
      body: formData,
    });
    return handleResponse(res);
  },

  // Progress & Analytics
  async getAnalytics(studentId = null) {
    const url = studentId ? `${API_BASE}/progress/analytics?student_id=${studentId}` : `${API_BASE}/progress/analytics`;
    const res = await fetch(url, { headers: { ...getAuthHeader() } });
    return handleResponse(res);
  },

  async logPomodoroSession(minutes, courseId = null) {
    const res = await fetch(`${API_BASE}/progress/log-session`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify({ minutes, course_id: courseId }),
    });
    return handleResponse(res);
  },

  // Alerts & Notifications
  async getAlerts() {
    const res = await fetch(`${API_BASE}/alerts`, {
      headers: { ...getAuthHeader() },
    });
    return handleResponse(res);
  },

  async triggerDailyAlertNow(studentId = null) {
    const res = await fetch(`${API_BASE}/alerts/trigger-now`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify({ student_id: studentId }),
    });
    return handleResponse(res);
  },

  // Parent Portal
  async getParentChildren() {
    const res = await fetch(`${API_BASE}/parent/children`, {
      headers: { ...getAuthHeader() },
    });
    return handleResponse(res);
  },

  // Admin Portal
  async getAdminOverview() {
    const res = await fetch(`${API_BASE}/admin/overview`, {
      headers: { ...getAuthHeader() },
    });
    return handleResponse(res);
  },

  async updateAdminUser(userId, data) {
    const res = await fetch(`${API_BASE}/admin/users/${userId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify(data),
    });
    return handleResponse(res);
  },

  async resetAdminData() {
    const res = await fetch(`${API_BASE}/admin/reset`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
    });
    return handleResponse(res);
  }
};
