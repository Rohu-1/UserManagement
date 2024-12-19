// const bcrypt = require('bcrypt');
const bcrypt = require('bcryptjs');
const validator = require('validator');
function getCleanIpAddress(req) {
    const ipAddress = req.headers['x-forwarded-for'] || 
                      req.connection.remoteAddress || 
                      req.socket.remoteAddress ||
                      (req.connection.socket ? req.connection.socket.remoteAddress : null);

    if (ipAddress) {
        if (ipAddress.substr(0, 7) == "::ffff:") {
            return ipAddress.substr(7);
        }
        return ipAddress.split(',')[0].trim();
    }
    return 'Unknown';
}
// Helper function to log activities
const logActivity = async (supabase, data) => {
  try {
      const { error } = await supabase
          .from('activities')
          .insert({
              user_id: data.userId,
              email: data.email,
              action: data.action,
              ip_address: data.ipAddress,
              created_at: new Date().toISOString()
          });

      if (error) {
          console.error('Activity logging error:', error);
          throw error; // Throw error to handle it in the calling function
      }
  } catch (err) {
      console.error('Failed to log activity:', err);
      throw err;
  }
};



// Signup with activity logging

exports.signup = async (req, res) => {
  const { email, password, name } = req.body;
  const { supabase } = req;
  const ipAddress = getCleanIpAddress(req);



  try {
      // Input Validation
      if (!email || !password) {
          return res.status(400).json({ 
              error: 'Email and password are required' 
          });
      }

      // Email validation
      if (!validator.isEmail(email)) {
          return res.status(400).json({ 
              error: 'Invalid email format' 
          });
      }

      // Password strength check
      if (password.length < 8) {
          return res.status(400).json({ 
              error: 'Password must be at least 8 characters long' 
          });
      }

      console.log('Checking for existing user...');
      // Check if user already exists
      const { data: existingUser, error: checkError } = await supabase
          .from('users')
          .select('*')
          .eq('email', email)
          .single();

      if (checkError && checkError.code !== 'PGRST116') {
          console.error('Error checking existing user:', checkError);
          return res.status(500).json({ 
              error: 'Error checking existing user' 
          });
      }

      if (existingUser) {
          return res.status(409).json({ 
              error: 'User with this email already exists' 
          });
      }

      console.log('Hashing password...');
      // Hash the password
      const saltRounds = 10;
      const hashedPassword = await bcrypt.hash(password, saltRounds);

      console.log('Inserting user...');
      // Insert user
      const { data: newUser, error: insertError } = await supabase
          .from('users')
          .insert({
              email: email,
              password: hashedPassword,
              name: name || null,
              created_at: new Date().toISOString()
          })
          .select()
          .single();

      if (insertError) {
          console.error('User insertion error:', insertError);
          return res.status(400).json({ 
              error: 'Failed to create user account', 
              details: insertError.message 
          });
      }

      console.log('Logging activity...');
      // Log signup activity
      try {
          await logActivity(supabase, {
              userId: newUser.id,
              email: email,
              action: 'SIGNUP',
              ipAddress: ipAddress
          });
      } catch (activityError) {
          console.error('Activity logging error:', activityError);
          // Continue with signup even if activity logging fails
      }

      res.status(201).json({
          message: 'User created successfully',
          userId: newUser.id
      });

  } catch (err) {
      console.error('Detailed signup error:', err);
      res.status(500).json({ 
          error: 'Internal server error during signup',
          details: process.env.NODE_ENV === 'development' ? err.message : undefined
      });
  }
};

// Login with activity logging
exports.login = async (req, res) => {
  const { email, password } = req.body;
  const { supabase } = req;
  const ipAddress = getCleanIpAddress(req);
  try {
      // Find user by email
      const { data: user, error: userError } = await supabase
          .from('users')
          .select('*')
          .eq('email', email)
          .single();

      // Check if user exists
      if (userError || !user) {
          return res.status(404).json({ 
              error: 'User not found' 
          });
      }

      // Compare passwords using bcrypt
      const isPasswordCorrect = await bcrypt.compare(
          password, 
          user.password
      );

      // Check password validity
      if (!isPasswordCorrect) {
          return res.status(401).json({ 
              error: 'Invalid credentials' 
          });
      }

      // Log login activity
      await logActivity(supabase, {
          userId: user.id,
          email: user.email,
          action: 'LOGIN',
          ipAddress: ipAddress
      });

      // Successful login
      res.status(200).json({
          message: 'Login successful',
          user: {
              id: user.id,
              email: user.email,
              name: user.name
          }
      });

  } catch (err) {
      console.error('Login error:', err);
      res.status(500).json({ 
          error: 'Internal server error' 
      });
  }
};
// Logout with activity logging
// Modified logout with email only
exports.logout = async (req, res) => {
  const { email } = req.body;
  const { supabase } = req;
  const ipAddress = getCleanIpAddress(req);
  try {
      // Validate email
      if (!email) {
          return res.status(400).json({ 
              error: 'Email is required' 
          });
      }

      // Get user details for activity logging
      const { data: user, error: userError } = await supabase
          .from('users')
          .select('id')
          .eq('email', email)
          .single();

      if (userError) {
          return res.status(404).json({ 
              error: 'User not found' 
          });
      }

      // Log logout activity
      await logActivity(supabase, {
          userId: user.id,
          email: email,
          action: 'LOGOUT',
          ipAddress: ipAddress
      });

      res.status(200).json({ 
          message: 'User logged out successfully',
          email: email
      });

  } catch (err) {
      console.error('Logout error:', err);
      res.status(500).json({ 
          error: 'Internal server error during logout' 
      });
  }
};
exports.getActivities = async (req, res) => {
    const { supabase } = req;
    const userId = req.headers.authorization.split(' ')[1]; // Assuming the token is the user ID
    const { action } = req.query; // Get the action from query parameters
  
    try {
      let query = supabase
        .from('activities')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
  
      // If action is provided, filter by it
      if (action) {
        query = query.eq('action', action);
      }
  
      const { data, error } = await query;
  
      if (error) throw error;
  
      res.json(data);
    } catch (err) {
      console.error('Error fetching activities:', err);
      res.status(500).json({ error: 'Failed to fetch activities' });
    }
  };

