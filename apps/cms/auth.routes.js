// apps/cms/routes/auth.routes.js
const express = require('express');
const SupabaseAuthController = require('../auth-supabase.controller');

const router = express.Router();
const authController = new SupabaseAuthController();

// Public routes
router.post('/register', (req, res) => authController.register(req, res));
router.post('/login', (req, res) => authController.login(req, res));
router.post('/google-login', (req, res) => authController.googleLogin(req, res));

// Protected routes
router.post('/logout', 
  (req, res, next) => authController.requireAuth(req, res, next),
  (req, res) => authController.logout(req, res)
);

router.get('/me', 
  (req, res, next) => authController.requireAuth(req, res, next),
  (req, res) => authController.getCurrentUser(req, res)
);

module.exports = router;