import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';

export default function HomePage() {
  return (
    <Container maxWidth="sm" sx={{ mt: 8, mb: 8, textAlign: 'center' }}>
      <Typography variant="h3" component="h1" fontWeight="bold" gutterBottom>
        Welcome to Ecomart!
      </Typography>
      <Typography variant="h6" color="text.secondary">
        Your one-stop shop for all your needs.
      </Typography>
    </Container>
  );
}
