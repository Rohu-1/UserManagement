const request = require('supertest');
const bcrypt = require('bcrypt');
const express = require('express');
const app = express();

// Mock Supabase
const supabase = {
  from: jest.fn(),
  auth: {
    signUp: jest.fn(),
    signIn: jest.fn(),
  },
};

app.use(express.json());  // Body parser middleware

// Your routes and controller logic here
app.post('/api/auth/signup', async (req, res) => {
  const { email, password, name } = req.body;

  // Check if the email is already taken (mocked by supabase.from)
  const { data, error } = await supabase.from('users').select().eq('email', email);
  if (data && data.length > 0) {
    return res.status(400).json({ error: 'Email already taken' });
  }

  // Hash the password (mock bcrypt hashing here)
  const hashedPassword = await bcrypt.hash(password, 10);

  // Simulate user creation
  const { error: signUpError } = await supabase.auth.signUp({ email, password: hashedPassword });
  if (signUpError) {
    return res.status(400).json({ error: signUpError.message });
  }

  res.status(201).json({ message: 'User created' });
});

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;

  // Simulate user login
  const { data, error } = await supabase.from('users').select().eq('email', email);
  if (error || !data || data.length === 0) {
    return res.status(400).json({ error: 'User not found' });
  }

  // Compare the password (mock bcrypt.compare)
  const isValid = await bcrypt.compare(password, data[0].password);
  if (!isValid) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  res.status(200).json({ message: 'Login successful' });
});

// Test cases
describe('Auth API', () => {
  jest.setTimeout(10000);  // Set a custom timeout of 10 seconds for the tests

  beforeEach(() => {
    jest.clearAllMocks();  // Reset mocks before each test
  });

  it('should create a new user', async () => {
    // Mock supabase to simulate email not taken
    supabase.from.mockResolvedValueOnce({ data: [], error: null });

    // Mock bcrypt hashing
    bcrypt.hash = jest.fn().mockResolvedValue('hashed_password');

    const response = await request(app)
      .post('/api/auth/signup')
      .send({
        email: 'test@example.com',
        password: 'password123',
        name: 'Test User',
      });

    expect(response.status).toBe(201);
    expect(response.body.message).toBe('User created');
  });

  it('should return an error if email is already taken', async () => {
    // Simulate the email already taken case
    supabase.from.mockResolvedValueOnce({ data: [{ email: 'test@example.com' }], error: null });

    const response = await request(app)
      .post('/api/auth/signup')
      .send({
        email: 'test@example.com',
        password: 'password123',
        name: 'Test User',
      });

    expect(response.status).toBe(400);
    expect(response.body.error).toBe('Email already taken');
  });

  it('should log in the user', async () => {
    // Mock supabase to simulate user found
    supabase.from.mockResolvedValueOnce({ data: [{ email: 'test@example.com', password: 'hashed_password' }], error: null });

    // Mock bcrypt.compare to return true (password match)
    bcrypt.compare = jest.fn().mockResolvedValue(true);

    const response = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'test@example.com',
        password: 'password123',
      });

    expect(response.status).toBe(200);
    expect(response.body.message).toBe('Login successful');
  });

  it('should return an error if login credentials are invalid', async () => {
    // Mock supabase to simulate user not found
    supabase.from.mockResolvedValueOnce({ data: [], error: null });

    const response = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'wrong@example.com',
        password: 'password123',
      });

    expect(response.status).toBe(400);
    expect(response.body.error).toBe('User not found');
  });

  it('should return an error if password is incorrect', async () => {
    // Mock supabase to simulate user found
    supabase.from.mockResolvedValueOnce({ data: [{ email: 'test@example.com', password: 'hashed_password' }], error: null });

    // Mock bcrypt.compare to return false (password does not match)
    bcrypt.compare = jest.fn().mockResolvedValue(false);

    const response = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'test@example.com',
        password: 'wrongpassword',
      });

    expect(response.status).toBe(401);
    expect(response.body.error).toBe('Invalid credentials');
  });
});
