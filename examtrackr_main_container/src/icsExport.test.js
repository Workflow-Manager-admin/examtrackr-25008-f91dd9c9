import { exportToICS } from './utils/icsExport';

describe('exportToICS', () => {
  let mockCreateObjectURL, mockRevokeObjectURL, mockClick, mockRemove;
  beforeEach(() => {
    mockCreateObjectURL = jest.fn(() => 'blob:ics-url');
    mockRevokeObjectURL = jest.fn();
    mockClick = jest.fn();
    mockRemove = jest.fn();
    global.Blob = function() { return {}; };

    global.URL.createObjectURL = mockCreateObjectURL;
    global.URL.revokeObjectURL = mockRevokeObjectURL;

    // Mock document.createElement for 'a'
    jest.spyOn(document, 'createElement').mockImplementation((type) => {
      if (type === 'a') {
        return {
          set href(val) { this._href = val; },
          get href() { return this._href; },
          set download(val) { this._download = val; },
          get download() { return this._download; },
          click: mockClick,
          remove: mockRemove,
          style: {},
          setAttribute: jest.fn(),
          appendChild: jest.fn(),
        };
      }
      return document.createElement(type);
    });
    document.body.appendChild = jest.fn();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should build ICS file and trigger download', () => {
    const events = [
      { title: 'Test Exam', description: 'Math', date: '2024-12-31T10:30:00Z' }
    ];
    exportToICS(events, 'custom.ics');
    expect(mockCreateObjectURL).toHaveBeenCalled();
    expect(mockClick).toHaveBeenCalled();
    expect(document.body.appendChild).toHaveBeenCalled();
    expect(mockRemove).toHaveBeenCalled();
    expect(mockRevokeObjectURL).toHaveBeenCalled();
  });

  it('handles multiple events and default filename', () => {
    const events = [
      { title: 'Final', description: 'Biology', date: '2024-06-01T09:15:00Z' },
      { title: 'Milestone', description: 'Review', date: '2024-05-15T19:00:00Z' }
    ];
    exportToICS(events); // default filename
    expect(mockClick).toHaveBeenCalled();
  });

  it('handles empty events array gracefully', () => {
    exportToICS([]);
    expect(mockClick).toHaveBeenCalled();
  });
});
