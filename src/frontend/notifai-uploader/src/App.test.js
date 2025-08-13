import { render, screen, waitFor } from '@testing-library/react';
import { act } from 'react-dom/test-utils';
import App from './App';
import { useAuth } from './components/AuthContext';
import axios from 'axios';

// Mock dependencies
jest.mock('axios', () => ({
  __esModule: true,
  default: {
    post: jest.fn()
  }
}));
jest.mock('./components/AuthContext', () => ({
  useAuth: jest.fn()
}));
jest.mock('./components/Header', () => () => <div>Header</div>);
jest.mock('./components/FileUpload', () => ({ onFileUpload }) => (
  <div>FileUpload <button onClick={() => onFileUpload({})}>Upload</button></div>
));
jest.mock('./components/AIFeedback', () => ({ feedback }) => <div>AIFeedback {JSON.stringify(feedback)}</div>);
jest.mock('./components/Costingtool', () => ({ pages, letterType }) => (
  <div>RoyalMailCalculator pages={pages} letterType={letterType}</div>
));
jest.mock('./components/Login', () => () => <div>Login</div>);

// Mock environment variables
window.env = {
  REACT_APP_API_GATEWAY: 'https://api.example.com'
};

describe('App Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders Login component when user is not authenticated', () => {
    useAuth.mockReturnValue({ user: null, refreshSession: jest.fn() });
    render(<App />);
    expect(screen.getByText('Login')).toBeInTheDocument();
    expect(screen.queryByText('Header')).not.toBeInTheDocument();
    expect(screen.queryByText('FileUpload')).not.toBeInTheDocument();
  });

  test('renders main components when user is authenticated', () => {
    useAuth.mockReturnValue({
      user: { idToken: 'mock-token' },
      refreshSession: jest.fn()
    });
    render(<App />);
    expect(screen.getByText('Header')).toBeInTheDocument();
    expect(screen.getByText('FileUpload')).toBeInTheDocument();
    expect(screen.getByText('AIFeedback {}')).toBeInTheDocument();
    expect(screen.getByText('RoyalMailCalculator pages=0 letterType=')).toBeInTheDocument();
    expect(screen.queryByText('Login')).not.toBeInTheDocument();
  });

  test('getPromptResp returns data on successful API call', async () => {
    useAuth.mockReturnValue({
      user: { idToken: 'mock-token' },
      refreshSession: jest.fn()
    });
    const mockResponse = { data: { result: 'mocked response' }, status: 200 };
    axios.post.mockResolvedValue(mockResponse);

    render(<App />);
    const file = new File(['test content'], 'test.txt', { type: 'text/plain' });
    await act(async () => {
      await screen.getByText('FileUpload').closest('div').querySelector('button').onclick({
        file_type: 'pdf',
        pages: 3,
        extracted_text: file
      });
    });

    await waitFor(() => {
      expect(axios.post).toHaveBeenCalledWith(
        'https://api.example.com',
        { input_text: 'test content' },
        { headers: { 'Content-Type': 'application/json', Authorization: 'Bearer mock-token' } }
      );
      expect(screen.getByText('AIFeedback {"result":"mocked response"}')).toBeInTheDocument();
      expect(screen.getByText('RoyalMailCalculator pages=3 letterType=pdf')).toBeInTheDocument();
    });
  });

  test('getPromptResp retries on 401 and returns data', async () => {
    useAuth.mockReturnValue({
      user: { idToken: 'mock-token' },
      refreshSession: jest.fn().mockResolvedValue()
    });
    const mockResponse = { data: { result: 'refreshed response' }, status: 200 };
    axios.post
      .mockRejectedValueOnce({ response: { status: 401 } })
      .mockResolvedValueOnce(mockResponse);

    render(<App />);
    const file = new File(['test content'], 'test.txt', { type: 'text/plain' });
    await act(async () => {
      await screen.getByText('FileUpload').closest('div').querySelector('button').onclick({
        file_type: 'pdf',
        pages: 3,
        extracted_text: file
      });
    });

    await waitFor(() => {
      expect(axios.post).toHaveBeenCalledTimes(2);
      expect(useAuth().refreshSession).toHaveBeenCalled();
      expect(screen.getByText('AIFeedback {"result":"refreshed response"}')).toBeInTheDocument();
    });
  });

  test('getPromptResp throws error on non-401 failure', async () => {
    useAuth.mockReturnValue({
      user: { idToken: 'mock-token' },
      refreshSession: jest.fn()
    });
    axios.post.mockRejectedValue(new Error('Network error'));

    render(<App />);
    const file = new File(['test content'], 'test.txt', { type: 'text/plain' });
    await expect(
      screen.getByText('FileUpload').closest('div').querySelector('button').onclick({
        file_type: 'pdf',
        pages: 3,
        extracted_text: file
      })
    ).rejects.toThrow('Error calling Lambda or session expired. Please log in again.');
  });

  test('handleFileUpload sets default letterType to docx when file_type is missing', async () => {
    useAuth.mockReturnValue({
      user: { idToken: 'mock-token' },
      refreshSession: jest.fn()
    });
    axios.post.mockResolvedValue({ data: { result: 'mocked response' }, status: 200 });

    render(<App />);
    const file = new File(['test content'], 'test.docx', { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
    await act(async () => {
      await screen.getByText('FileUpload').closest('div').querySelector('button').onclick({
        extracted_text: file
      });
    });

    await waitFor(() => {
      expect(screen.getByText('RoyalMailCalculator pages=0 letterType=docx')).toBeInTheDocument();
      expect(screen.getByText('AIFeedback {"result":"mocked response"}')).toBeInTheDocument();
    });
  });

  test('handleFileUpload does not set pages for docx files', async () => {
    useAuth.mockReturnValue({
      user: { idToken: 'mock-token' },
      refreshSession: jest.fn()
    });
    axios.post.mockResolvedValue({ data: { result: 'mocked response' }, status: 200 });

    render(<App />);
    const file = new File(['test content'], 'test.docx', { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
    await act(async () => {
      await screen.getByText('FileUpload').closest('div').querySelector('button').onclick({
        file_type: 'docx',
        pages: 3,
        extracted_text: file
      });
    });

    await waitFor(() => {
      expect(screen.getByText('RoyalMailCalculator pages=0 letterType=docx')).toBeInTheDocument();
    });
  });
});
