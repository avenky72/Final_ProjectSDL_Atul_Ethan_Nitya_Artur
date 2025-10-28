// auth-supabase.controller.js - Authentication controller for Supabase integration
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');
const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL || 'https://yjdhrwdoxufzzvijtmbh.supabase.co';
const supabaseKey = process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// Initialize Google OAuth client
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// JWT configuration
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const JWT_EXPIRES_IN = '7d';

class SupabaseAuthController {
  // Generate JWT token
  generateToken(userId) {
    return jwt.sign(
      { userId, timestamp: Date.now() },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );
  }

  // Verify JWT token
  verifyToken(token) {
    try {
      return jwt.verify(token, JWT_SECRET);
    } catch (error) {
      return null;
    }
  }

  // Hash password
  async hashPassword(password) {
    return bcrypt.hash(password, 10);
  }

  // Compare password
  async comparePassword(password, hash) {
    return bcrypt.compare(password, hash);
  }

  // Register with email using Supabase
  async register(req, res) {
    const { email, password, fullName } = req.body;

    try {
      // Validate input
      if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required' });
      }

      // Check if user exists
      const { data: existingUser } = await supabase
        .from('users')
        .select('id')
        .eq('email', email.toLowerCase())
        .single();

      if (existingUser) {
        return res.status(400).json({ error: 'User already exists' });
      }

      // Hash password
      const passwordHash = await this.hashPassword(password);

      // Create verification token
      const verificationToken = crypto.randomBytes(32).toString('hex');

      // Insert new user
      const { data: user, error: insertError } = await supabase
        .from('users')
        .insert({
          email: email.toLowerCase(),
          password_hash: passwordHash,
          full_name: fullName,
          auth_provider: 'email',
          verification_token: verificationToken
        })
        .select('id, email, full_name, email_verified')
        .single();

      if (insertError) {
        throw insertError;
      }

      // Generate token
      const token = this.generateToken(user.id);

      // Create session
      const { error: sessionError } = await supabase
        .from('user_sessions')
        .insert({
          user_id: user.id,
          token: token,
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          ip_address: req.ip,
          user_agent: req.get('user-agent')
        });

      if (sessionError) {
        console.error('Session creation error:', sessionError);
      }

      res.status(201).json({
        success: true,
        user: {
          id: user.id,
          email: user.email,
          fullName: user.full_name,
          emailVerified: user.email_verified
        },
        token
      });

    } catch (error) {
      console.error('Registration error:', error);
      res.status(500).json({ error: 'Failed to register user' });
    }
  }

  // Login with email using Supabase
  async login(req, res) {
    const { email, password } = req.body;

    try {
      // Validate input
      if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required' });
      }

      // Find user
      const { data: user, error: userError } = await supabase
        .from('users')
        .select('id, email, password_hash, full_name, email_verified, role')
        .eq('email', email.toLowerCase())
        .eq('auth_provider', 'email')
        .single();

      if (userError || !user) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      // Verify password
      const isValidPassword = await this.comparePassword(password, user.password_hash);
      if (!isValidPassword) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      // Generate token
      const token = this.generateToken(user.id);

      // Create session
      await supabase
        .from('user_sessions')
        .insert({
          user_id: user.id,
          token: token,
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          ip_address: req.ip,
          user_agent: req.get('user-agent')
        });

      // Update last login
      await supabase
        .from('users')
        .update({ last_login: new Date().toISOString() })
        .eq('id', user.id);

      res.json({
        success: true,
        user: {
          id: user.id,
          email: user.email,
          fullName: user.full_name,
          emailVerified: user.email_verified,
          role: user.role
        },
        token
      });

    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ error: 'Failed to login' });
    }
  }

  // Google OAuth login using Supabase
  async googleLogin(req, res) {
    const { idToken } = req.body;

    try {
      // Verify Google token
      const ticket = await googleClient.verifyIdToken({
        idToken,
        audience: process.env.GOOGLE_CLIENT_ID
      });

      const payload = ticket.getPayload();
      const { email, name, picture, sub: googleId } = payload;

      // Check if user exists by Google ID or email
      let { data: user } = await supabase
        .from('users')
        .select('id, email, full_name, role, google_id')
        .or(`google_id.eq.${googleId},email.eq.${email.toLowerCase()}`)
        .single();

      if (!user) {
        // Create new user
        const { data: newUser, error: insertError } = await supabase
          .from('users')
          .insert({
            email: email.toLowerCase(),
            full_name: name,
            avatar_url: picture,
            auth_provider: 'google',
            google_id: googleId,
            email_verified: true
          })
          .select('id, email, full_name, role')
          .single();

        if (insertError) {
          throw insertError;
        }
        user = newUser;
      } else if (!user.google_id) {
        // Link Google account to existing user
        await supabase
          .from('users')
          .update({ 
            google_id: googleId, 
            email_verified: true 
          })
          .eq('id', user.id);
      }

      // Generate JWT token
      const token = this.generateToken(user.id);

      // Create session
      await supabase
        .from('user_sessions')
        .insert({
          user_id: user.id,
          token: token,
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          ip_address: req.ip,
          user_agent: req.get('user-agent')
        });

      // Update last login
      await supabase
        .from('users')
        .update({ last_login: new Date().toISOString() })
        .eq('id', user.id);

      res.json({
        success: true,
        user: {
          id: user.id,
          email: user.email,
          fullName: user.full_name,
          role: user.role
        },
        token
      });

    } catch (error) {
      console.error('Google login error:', error);
      res.status(500).json({ error: 'Failed to authenticate with Google' });
    }
  }

  // Logout using Supabase
  async logout(req, res) {
    const token = req.headers.authorization?.replace('Bearer ', '');

    try {
      if (token) {
        // Remove session
        await supabase
          .from('user_sessions')
          .delete()
          .eq('token', token);
      }

      res.json({ success: true, message: 'Logged out successfully' });

    } catch (error) {
      console.error('Logout error:', error);
      res.status(500).json({ error: 'Failed to logout' });
    }
  }

  // Get current user using Supabase
  async getCurrentUser(req, res) {
    try {
      const userId = req.userId; // Set by auth middleware

      const { data: user, error } = await supabase
        .from('users')
        .select('id, email, full_name, avatar_url, role, email_verified')
        .eq('id', userId)
        .single();

      if (error || !user) {
        return res.status(404).json({ error: 'User not found' });
      }

      res.json({ user });

    } catch (error) {
      console.error('Get user error:', error);
      res.status(500).json({ error: 'Failed to get user' });
    }
  }

  // Middleware to verify authentication using Supabase
  async requireAuth(req, res, next) {
    const token = req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    try {
      // Verify token
      const decoded = this.verifyToken(token);
      if (!decoded) {
        return res.status(401).json({ error: 'Invalid token' });
      }

      // Check if session exists and is valid in Supabase
      const { data: session } = await supabase
        .from('user_sessions')
        .select('user_id, expires_at')
        .eq('token', token)
        .gt('expires_at', new Date().toISOString())
        .single();

      if (!session) {
        return res.status(401).json({ error: 'Session expired' });
      }

      req.userId = session.user_id;
      req.token = token;
      next();

    } catch (error) {
      console.error('Auth middleware error:', error);
      res.status(401).json({ error: 'Authentication failed' });
    }
  }
}

module.exports = SupabaseAuthController;