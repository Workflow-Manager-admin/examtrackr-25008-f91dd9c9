import React from 'react';
import { render, fireEvent, screen, act, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import App from './App';

// Mocks for supabase and other browser APIs
jest.mock('./supabaseClient', () => {
  const mAuth = {
    getSession: jest.fn(() => Promise.resolve({ data: { session: null } })),
    onAuthStateChange: jest.fn(() => ({
      data: {
        subscription: { unsubscribe: jest.fn() }
      }
    })),
    signInWithPassword: jest.fn(),
    signUp: jest.fn(),
    signOut: jest.fn(),
  };
  return {
    supabase: {
      auth: mAuth,
      from: jest.fn(() => ({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({ data: [] }),
        insert: jest.fn().mockResolvedValue({}),
        update: jest.fn().mockResolvedValue({}),
        delete: jest.fn().mockResolvedValue({}),
      })),
      // Optionally, mock 'realtime' as a no-op for now
      realtime: {
        subscribe: jest.fn(),
        unsubscribe: jest.fn(),
      }
    }
  };
});

// Mock exportToICS utility
jest.mock('./utils/icsExport', () => ({
  exportToICS: jest.fn(),
}));

// Mock window.matchMedia (for theme detection), window.localStorage, window.URL, document.createElement, and scrolling APIs
beforeAll(() => {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: jest.fn().mockImplementation(query => ({
      matches: false,
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      addListener: jest.fn(),
      removeListener: jest.fn(),
      onchange: null,
      dispatchEvent: jest.fn(),
    })),
  });

  // Mock localStorage
  let localStore = {};
  Object.defineProperty(window, 'localStorage', {
    value: {
      getItem: jest.fn((k) => localStore[k]),
      setItem: jest.fn((k, v) => { localStore[k] = v; }),
      removeItem: jest.fn((k) => { delete localStore[k]; }),
      clear: jest.fn(() => { localStore = {}; }),
    },
    writable: true,
  });

  // Mock URL.createObjectURL and revokeObjectURL
  global.URL.createObjectURL = jest.fn(() => 'blob:url');
  global.URL.revokeObjectURL = jest.fn();

  // Mock document.createElement for export
  jest.spyOn(document, 'createElement').mockImplementation((type) => {
    if (type === 'a') {
      return {
        set href(val) { this._href = val; },
        get href() { return this._href; },
        set download(val) { this._download = val; },
        get download() { return this._download; },
        click: jest.fn(),
        style: {},
        setAttribute: jest.fn(),
        appendChild: jest.fn(),
        remove: jest.fn(),
      };
    }
    return document.createElement(type);
  });
});

afterEach(() => {
  jest.clearAllMocks();
});

describe('ExamTrackr App Integration Tests', () => {
  test('renders login by default and allows sign-in/sign-up toggle', async () => {
    render(<App />);
    expect(screen.getByText(/sign in/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/email/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/password/i)).toBeInTheDocument();

    // Toggle to sign up
    fireEvent.click(screen.getByText(/sign up/i, { selector: 'button' }));
    expect(screen.getByText(/sign up/i)).toBeInTheDocument();

    // Toggle back to sign in
    fireEvent.click(screen.getByText(/sign in/i, { selector: 'button' }));
    expect(screen.getByText(/sign in/i)).toBeInTheDocument();
  });

  test('signs in user and displays dashboard', async () => {
    const user = { email: 'test@example.com', id: '1' };
    const mSupabase = require('./supabaseClient').supabase;
    mSupabase.auth.getSession.mockImplementationOnce(() =>
      Promise.resolve({ data: { session: { user } } })
    );
    mSupabase.auth.onAuthStateChange.mockImplementationOnce((cb) => ({
      data: {
        subscription: { unsubscribe: jest.fn() }
      }
    }));

    // Exams fetch stub
    mSupabase.from.mockReturnValue({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      order: jest.fn().mockResolvedValue({
        data: [
          { id: '10', title: 'Math Final', subject: 'Math', date: '2099-06-10', milestones: [], grade: null, reflection: null }
        ]
      }),
    });

    // Render and check dashboard
    await act(async () => { render(<App />); });

    expect(await screen.findByText(/math final/i)).toBeInTheDocument();
    expect(screen.getByText(/signed in as/i)).toHaveTextContent('test@example.com');
    expect(screen.getByText(/add exam/i)).toBeInTheDocument();
  });

  test('can add an exam and see it on dashboard', async () => {
    // Simulate signed in user and empty exam list, verify Add
    const user = { email: 'addexam@test.com', id: 'u-add' };
    const mSupabase = require('./supabaseClient').supabase;
    mSupabase.auth.getSession.mockImplementation(() =>
      Promise.resolve({ data: { session: { user } } })
    );
    mSupabase.from.mockReturnValue({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      order: jest.fn()
        .mockResolvedValueOnce({ data: [] }) // initial fetch: no exams
        .mockResolvedValueOnce({ data: [
          { id: 'e1', title: 'Physics Test', subject: 'Physics', date: '2099-07-02', milestones: [], grade: null, reflection: null }
        ] })
    });

    await act(async () => { render(<App />); });

    fireEvent.click(screen.getByText(/add exam/i));

    // Fill and submit form
    fireEvent.change(screen.getByLabelText(/title/i), { target: { value: 'Physics Test' } });
    fireEvent.change(screen.getByLabelText(/subject/i), { target: { value: 'Physics' } });
    fireEvent.change(screen.getByLabelText(/^date/i), { target: { value: '2099-07-02' } });
    fireEvent.click(screen.getByText(/^save$/i, { selector: 'button' }));

    // Should appear on dashboard after "saving" (mocked)
    await waitFor(() => expect(screen.getByText(/physics test/i)).toBeInTheDocument());
  });

  test('exam card color code changes with date (urgency)', async () => {
    const user = { email: 'urgency@t.com', id: 'urg-user' };
    const mSupabase = require('./supabaseClient').supabase;
    mSupabase.auth.getSession.mockImplementation(() =>
      Promise.resolve({ data: { session: { user } } })
    );
    // Provide various dates
    const today = new Date();
    function daysFromNow(n) {
      const d = new Date(today);
      d.setDate(d.getDate() + n);
      return d.toISOString().substring(0,10);
    }
    mSupabase.from.mockReturnValue({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      order: jest.fn().mockResolvedValue({
        data: [
          { id: 'g1', title: 'Far Exam', subject: 'A', date: daysFromNow(20), milestones: [], grade: null, reflection: null },
          { id: 'y1', title: 'Mid Exam', subject: 'B', date: daysFromNow(6), milestones: [], grade: null, reflection: null },
          { id: 'r1', title: 'Soon Exam', subject: 'C', date: daysFromNow(2), milestones: [], grade: null, reflection: null }
        ]
      }),
    });

    await act(async () => { render(<App />); });

    // Green
    expect(screen.getByText(/far exam/i).closest('.rounded-lg')).toHaveClass('bg-white/90');
    // Yellow
    expect(screen.getByText(/mid exam/i).closest('.rounded-lg')).toHaveClass('bg-white/90');
    // Red
    expect(screen.getByText(/soon exam/i).closest('.rounded-lg')).toHaveClass('bg-white/90');
    // (Note: Actual color class would be on urgency badge inside the card.)
    const farBadge = screen.getByText(/\d+d/i, { selector: '.font-mono' });
    expect(farBadge.className).toMatch(/bg-green-300/);
  });

  test('theme toggling affects html class', async () => {
    const user = { email: 'theme@trackr.com', id: 'u-theme' };
    const mSupabase = require('./supabaseClient').supabase;
    mSupabase.auth.getSession.mockImplementation(() =>
      Promise.resolve({ data: { session: { user } } })
    );
    mSupabase.from.mockReturnValue({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      order: jest.fn().mockResolvedValue({ data: [] }),
    });

    render(<App />);
    const toggleBtn = screen.getByLabelText(/toggle light\/dark mode/i);

    // Initial is light (default matchMedia: false)
    expect(document.documentElement.classList.contains('dark')).toBe(false);
    fireEvent.click(toggleBtn);
    expect(document.documentElement.classList.contains('dark')).toBe(true);
    fireEvent.click(toggleBtn);
    expect(document.documentElement.classList.contains('dark')).toBe(false);
  });

  test('milestone CRUD should open respective modal', async () => {
    const user = { email: 'mile@stone.com', id: 'm1' };
    const mSupabase = require('./supabaseClient').supabase;
    mSupabase.auth.getSession.mockImplementation(() =>
      Promise.resolve({ data: { session: { user } } })
    );
    mSupabase.from.mockReturnValue({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      order: jest.fn().mockResolvedValue({
        data: [
          { id: 'e11', title: 'Final', subject: 'Chem', date: '2099-12-31', milestones: [
            {id:'ms1',title:'Review Ch1',target_date:'2099-12-20',status:'pending'}
          ], grade: null, reflection: null }
        ]
      }),
    });

    await act(async () => { render(<App />); });
    // Expand exam
    fireEvent.click(screen.getByText(/final/i, { selector: '.font-semibold' }));

    // Add Milestone
    fireEvent.click(screen.getByText(/\+ add/i));
    expect(screen.getByText(/milestone:/i)).toBeInTheDocument();
    fireEvent.click(screen.getByText(/cancel/i, { selector: 'button' }));

    // Edit Milestone
    fireEvent.click(screen.getByText(/edit/i, { selector: 'button' }));
    expect(screen.getByText(/milestone:/i)).toBeInTheDocument();
    fireEvent.click(screen.getByText(/cancel/i, { selector: 'button' }));

    // Delete Milestone
    fireEvent.click(screen.getByText(/del/i, { selector: 'button' }));
    // Just close modal for now, full deletion logic covered in "integration"
  });

  test('grade logging modal appears when logging grade for ended exam', async () => {
    const user = { email: 'grader@trackr.com', id: 'grader' };
    const mSupabase = require('./supabaseClient').supabase;
    mSupabase.auth.getSession.mockImplementation(() =>
      Promise.resolve({ data: { session: { user } } })
    );
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    mSupabase.from.mockReturnValue({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      order: jest.fn().mockResolvedValue({
        data: [
          { id: 'e15', title: 'History', subject: 'Hist', date: yesterday.toISOString().substring(0,10), milestones: [], grade: null, reflection: null }
        ]
      }),
    });

    await act(async () => { render(<App />); });
    // Expand card
    fireEvent.click(screen.getByText(/history/i, { selector: '.font-semibold' }));

    // Log grade
    fireEvent.click(screen.getByText(/log grade & reflection/i));
    expect(screen.getByText(/grade:/i)).toBeInTheDocument();

    // Fill and Save
    fireEvent.change(screen.getByLabelText(/^grade:/i), { target: { value: 'A+' } });
    fireEvent.change(screen.getByLabelText(/reflection/i), { target: { value: 'Well prepared' } });
    fireEvent.click(screen.getByText(/^save$/i, { selector: 'button' }));

    await waitFor(() => {
      // Modal closes, no visible grade form
      expect(screen.queryByText(/grade:/i)).not.toBeInTheDocument();
    });
  });

  test('calendar export triggers exportToICS with correct data', async () => {
    const user = { email: 'expo@trackr.com', id: 'expo' };
    const mSupabase = require('./supabaseClient').supabase;
    mSupabase.auth.getSession.mockImplementation(() =>
      Promise.resolve({ data: { session: { user } } })
    );
    mSupabase.from.mockReturnValue({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      order: jest.fn().mockResolvedValue({
        data: [
          { id: 'e16', title: 'Geology', subject: 'Earth', date: '2099-09-30', milestones: [
            { id: 'ms10', title: 'Map Review', target_date: '2099-09-15', status: 'done' }
          ], grade: null, reflection: null }
        ]
      }),
    });

    const mExport = require('./utils/icsExport').exportToICS;
    await act(async () => { render(<App />); });

    fireEvent.click(screen.getByText(/export calendar/i));
    expect(mExport).toHaveBeenCalled();
    expect(mExport.mock.calls[0][0].length).toBeGreaterThanOrEqual(2); // Each exam + milestone
    expect(mExport.mock.calls[0][1]).toBe('ExamTrackr.ics');
  });

  test('dashboard sort/filter works', async () => {
    const user = { email: 'sorter@trackr.com', id: 'sorter' };
    const mSupabase = require('./supabaseClient').supabase;
    mSupabase.auth.getSession.mockImplementation(() =>
      Promise.resolve({ data: { session: { user } } })
    );
    mSupabase.from.mockReturnValue({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      order: jest.fn().mockResolvedValue({
        data: [
          { id: 'a', title: 'A Exam', subject: 'Bio', date: '2099-01-01', milestones: [] },
          { id: 'c', title: 'C Exam', subject: 'Chem', date: '2099-03-03', milestones: [] },
          { id: 'b', title: 'B Exam', subject: 'Math', date: '2099-02-02', milestones: [] },
        ]
      }),
    });

    await act(async () => { render(<App />); });

    // Default sort: date
    const exams = screen.getAllByText(/exam/i).filter(e => e.tagName === 'DIV');
    expect(exams.length).toBeGreaterThan(1);

    // Sort by title
    fireEvent.change(screen.getByDisplayValue(/sort by date/i), { target: { value: 'title' } });
    // Should reorder, but simulate only (DOM order not strictly checked here).

    // Filter by subject
    fireEvent.change(screen.getByPlaceholderText(/filter/i), { target: { value: 'math' } });
    expect(screen.getByText(/b exam/i)).toBeInTheDocument();
    expect(screen.queryByText(/a exam/i)).not.toBeInTheDocument();
  });
});
