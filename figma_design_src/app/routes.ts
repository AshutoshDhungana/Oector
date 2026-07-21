import { createBrowserRouter } from 'react-router';
import LandingPage from './components/landing/LandingPage';
import LoginPage from './components/auth/LoginPage';
import SignupPage from './components/auth/SignupPage';

export const router = createBrowserRouter([
  { path: '/', Component: LandingPage },
  { path: '/login', Component: LoginPage },
  { path: '/signup', Component: SignupPage },
  { path: '*', Component: LandingPage },
]);
