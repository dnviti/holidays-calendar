import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../contexts/ThemeContext';
import api from '../services/api';
import {
  Box,
  Container,
  Paper,
  TextField,
  Button,
  Typography,
  Stack,
  Alert,
  CircularProgress,
  IconButton,
  InputAdornment,
  FormControl,
  OutlinedInput,
  InputLabel
} from '@mui/material';
import { Visibility, VisibilityOff } from '@mui/icons-material';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';

const Login = () => {
  const { branding } = useTheme();
  const { t } = useTranslation('auth');

  // Define validation schema
  const validationSchema = yup.object().shape({
    email: yup
      .string()
      .email(t('validation.emailInvalid'))
      .required(t('validation.emailRequired')),
    password: yup
      .string()
      .min(6, t('validation.passwordMinLength', { min: 6 }))
      .required(t('validation.passwordRequired'))
  });

  // Initialize form
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset
  } = useForm({
    resolver: yupResolver(validationSchema),
    mode: 'onChange'
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleMicrosoftLogin = () => {
    window.location.href = `${import.meta.env.VITE_API_BASE_URL || '/api'}/auth/login`;
  };

  const handleLocalLogin = async (data) => {
    const { email, password } = data;

    setLoading(true);
    setError('');

    try {
      const response = await api.post('/auth/login-local', new URLSearchParams({
        username: email,
        password: password
      }), {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
      });

      const { access_token } = response.data;
      localStorage.setItem('token', access_token);
      window.location.href = '/';
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.detail || t('validation.loginFailed'));
    } finally {
      setLoading(false);
    }
  };

  const handleClickShowPassword = () => {
    setShowPassword(!showPassword);
  };

  const handleMouseDownPassword = (event) => {
    event.preventDefault();
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        p: 2,
        bgcolor: 'background.default'
      }}
    >
      <Container maxWidth="xs">
        <Paper
          elevation={8}
          sx={{
            p: 4,
            borderRadius: 3,
            boxShadow: '0px 11px 15px -7px rgba(0,0,0,0.2), 0px 24px 38px 3px rgba(0,0,0,0.14), 0px 9px 46px 8px rgba(0,0,0,0.12)',
            backgroundColor: 'background.paper'
          }}
        >
          <Stack spacing={3} alignItems="center">
            {/* Logo Section */}
            <Box sx={{ mb: 2, display: 'flex', justifyContent: 'center' }}>
              {branding?.logo_url ? (
                <img
                  src={branding.logo_url}
                  alt="Logo"
                  style={{ height: '60px', width: 'auto', objectFit: 'contain' }}
                />
              ) : (
                <Box
                  sx={{
                    width: 60,
                    height: 60,
                    borderRadius: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 'bold',
                    fontSize: '1.5rem',
                    bgcolor: 'primary.main',
                    color: 'white'
                  }}
                >
                  {branding?.app_name?.charAt(0) || 'H'}
                </Box>
              )}
            </Box>

            {/* Title and Subtitle */}
            <Typography
              variant="h4"
              component="h1"
              align="center"
              sx={{
                fontWeight: 700,
                color: 'text.primary',
                mb: 1
              }}
            >
              {branding?.app_name || 'Holiday Calendar'}
            </Typography>

            <Typography
              variant="subtitle1"
              align="center"
              sx={{
                color: 'text.secondary',
                mb: 3
              }}
            >
              {t('login.title')}
            </Typography>

            {/* Error Message */}
            {error && (
              <Alert
                severity="error"
                sx={{
                  width: '100%',
                  '& .MuiAlert-message': {
                    width: '100%'
                  }
                }}
              >
                {error}
              </Alert>
            )}

            {/* Login Form */}
            <Box
              component="form"
              onSubmit={handleSubmit(handleLocalLogin)}
              sx={{ width: '100%', mt: 2 }}
            >
              <Stack spacing={3}>
                <TextField
                  fullWidth
                  label={t('login.email')}
                  type="email"
                  variant="outlined"
                  {...register('email')}
                  error={!!errors.email}
                  helperText={errors.email?.message}
                  autoComplete="email"
                  placeholder={t('login.emailPlaceholder')}
                  InputProps={{
                    sx: {
                      borderRadius: 2,
                    }
                  }}
                  InputLabelProps={{
                    shrink: true,
                  }}
                />

                <FormControl fullWidth variant="outlined" error={!!errors.password}>
                  <InputLabel htmlFor="password-input">{t('login.password')}</InputLabel>
                  <OutlinedInput
                    id="password-input"
                    type={showPassword ? 'text' : 'password'}
                    {...register('password')}
                    autoComplete="current-password"
                    placeholder={t('login.passwordPlaceholder')}
                    endAdornment={
                      <InputAdornment position="end">
                        <IconButton
                          aria-label="toggle password visibility"
                          onClick={handleClickShowPassword}
                          onMouseDown={handleMouseDownPassword}
                          edge="end"
                        >
                          {showPassword ? <VisibilityOff /> : <Visibility />}
                        </IconButton>
                      </InputAdornment>
                    }
                    label={t('login.password')}
                    sx={{
                      borderRadius: 2,
                    }}
                  />
                  {errors.password && (
                    <Typography variant="caption" color="error" sx={{ mt: 0.5 }}>
                      {errors.password.message}
                    </Typography>
                  )}
                </FormControl>

                <Button
                  type="submit"
                  variant="contained"
                  size="large"
                  fullWidth
                  disabled={loading}
                  sx={{
                    py: 1.5,
                    fontSize: '1rem',
                    fontWeight: 600,
                    borderRadius: 2,
                    textTransform: 'none',
                    boxShadow: '0px 3px 1px -2px rgba(0,0,0,0.2), 0px 2px 2px 0px rgba(0,0,0,0.14), 0px 1px 5px 0px rgba(0,0,0,0.12)',
                    '&:hover': {
                      boxShadow: '0px 2px 4px -1px rgba(0,0,0,0.2), 0px 4px 5px 0px rgba(0,0,0,0.14), 0px 1px 10px 0px rgba(0,0,0,0.12)',
                    }
                  }}
                >
                  {loading ? <CircularProgress size={24} sx={{ color: 'white' }} /> : t('login.signIn')}
                </Button>
              </Stack>
            </Box>

            {/* Divider */}
            <Box sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '100%',
              my: 3
            }}>
              <Box sx={{
                flexGrow: 1,
                borderTop: '1px solid',
                borderColor: 'divider'
              }} />
              <Typography
                variant="body2"
                sx={{
                  px: 2,
                  color: 'text.secondary',
                  bgcolor: 'background.paper',
                  borderRadius: 1,
                  mx: 1
                }}
              >
                {t('login.orDivider')}
              </Typography>
              <Box sx={{
                flexGrow: 1,
                borderTop: '1px solid',
                borderColor: 'divider'
              }} />
            </Box>

            {/* Microsoft Login Button */}
            <Button
              variant="outlined"
              fullWidth
              size="large"
              onClick={handleMicrosoftLogin}
              sx={{
                py: 1.2,
                fontSize: '0.95rem',
                fontWeight: 500,
                borderRadius: 2,
                textTransform: 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 1,
                borderColor: 'divider',
                color: 'text.primary',
                '&:hover': {
                  borderColor: 'primary.main',
                  backgroundColor: 'action.hover',
                }
              }}
            >
              <Box
                component="svg"
                sx={{ width: 24, height: 24, mr: 1 }}
                viewBox="0 0 21 21"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path d="M1 1H10V10H1V1Z" fill="#F25022" />
                <path d="M11 1H20V10H11V1Z" fill="#7FBA00" />
                <path d="M1 11H10V20H1V11Z" fill="#00A4EF" />
                <path d="M11 11H20V20H11V11Z" fill="#FFB900" />
              </Box>
              {t('login.signInWithMicrosoft')}
            </Button>
          </Stack>
        </Paper>
      </Container>
    </Box>
  );
};

export default Login;
