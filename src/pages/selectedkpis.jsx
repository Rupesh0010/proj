// LOGIN PAGE CODE -------------------------------------------------------------

import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box,
  Paper,
  TextField,
  Button,
  Typography,
  InputAdornment,
  IconButton,
  Divider,
} from "@mui/material";
import FacebookIcon from "@mui/icons-material/Facebook";
import LinkedInIcon from "@mui/icons-material/LinkedIn";
import GoogleIcon from "@mui/icons-material/Google";
import Visibility from "@mui/icons-material/Visibility";
import VisibilityOff from "@mui/icons-material/VisibilityOff";
import "./loginpage.css";

function LoginPage() {
  const [form, setForm] = useState({
    email: "Jorie@example.com",
    password: "jorie@123",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setError("");
  };

  const navigate = useNavigate();

  const handleLogin = (e) => {
    e.preventDefault();
    if (form.email === "Jorie@example.com" && form.password === "jorie@123") {
      navigate("/dashboard"); // Redirect to dashboard page
    } else {
      setError("Either username or email is incorrect.");
    }
  };

  return (
    <Box className="login-bg">
      <Paper className="login-card" elevation={6}>
        {/* Left Illustration */}
        <Box className="login-left">
          <img src="/image.png" alt="Illustration" className="illus-img" />
        </Box>

        {/* Right Form */}
        <Box className="login-right">
          <Typography className="welcome-text">Welcome Back 👋</Typography>
          <Typography className="register-sub">
            Login to continue using <b>Jorie AI </b>
          </Typography>

          <form className="login-form" onSubmit={handleLogin}>
            <TextField
              label="Email"
              name="email"
              value={form.email}
              onChange={handleChange}
              fullWidth
              margin="normal"
              className="input-field"
              type="email"
            />
            <TextField
              label="Password"
              name="password"
              value={form.password}
              onChange={handleChange}
              fullWidth
              margin="normal"
              className="input-field"
              type={showPassword ? "text" : "password"}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      onClick={() => setShowPassword((prev) => !prev)}
                      edge="end"
                    >
                      {showPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />

            {error && (
              <Typography className="error-text" align="center">
                {error}
              </Typography>
            )}

            <Button variant="contained" fullWidth className="login-btn" type="submit">
              Login
            </Button>
          </form>
        </Box>
      </Paper>
    </Box>
  );
}

export default LoginPage;
