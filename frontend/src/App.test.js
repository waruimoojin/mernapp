import { render, screen } from '@testing-library/react';
import App from './App';

// Test basique pour vérifier le rendu
test('renders learn react link', () => {
  render(<App />);
  const linkElement = screen.getByText(/learn react/i);
  expect(linkElement).toBeInTheDocument();
});

// Test pour un composant spécifique
test('displays header correctly', () => {
  render(<App />);
  const headerElement = screen.getByRole('heading');
  expect(headerElement).toHaveTextContent('Welcome');
});