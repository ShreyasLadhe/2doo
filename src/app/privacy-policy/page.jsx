'use client';

import { Container, Typography, Paper, Box, Breadcrumbs, Link } from '@mui/material';
import { paths } from 'src/routes/paths';
import { RouterLink } from 'src/routes/components';
import { DashboardContent } from 'src/layouts/dashboard';

export default function PrivacyPolicyPage() {
    return (
        <DashboardContent>
            <Container maxWidth="lg" sx={{ py: 5 }}>
                <Breadcrumbs sx={{ mb: 3 }}>
                    <Link component={RouterLink} href="/" color="inherit">
                        Home
                    </Link>
                    <Typography color="text.primary">Privacy Policy</Typography>
                </Breadcrumbs>

                <Paper sx={{ p: { xs: 3, md: 5 } }}>
                    <Typography variant="h3" component="h1" gutterBottom>
                        Privacy Policy
                    </Typography>

                    <Typography variant="body1" paragraph>
                        Last updated: {new Date().toLocaleDateString()}
                    </Typography>

                    <Box sx={{ mt: 4 }}>
                        <Typography variant="h5" gutterBottom>
                            1. Information We Collect
                        </Typography>
                        <Typography variant="body1" paragraph>
                            We collect information that you provide directly to us, including but not limited to:
                        </Typography>
                        <ul>
                            <li>Name and contact information</li>
                            <li>Account credentials</li>
                            <li>Task and project data</li>
                            <li>Usage data and preferences</li>
                        </ul>
                    </Box>

                    <Box sx={{ mt: 4 }}>
                        <Typography variant="h5" gutterBottom>
                            2. How We Use Your Information
                        </Typography>
                        <Typography variant="body1" paragraph>
                            We use the information we collect to:
                        </Typography>
                        <ul>
                            <li>Provide and maintain our services</li>
                            <li>Process your transactions</li>
                            <li>Send you technical notices and support messages</li>
                            <li>Communicate with you about products, services, and events</li>
                        </ul>
                    </Box>

                    <Box sx={{ mt: 4 }}>
                        <Typography variant="h5" gutterBottom>
                            3. Data Security
                        </Typography>
                        <Typography variant="body1" paragraph>
                            We implement appropriate technical and organizational measures to protect your personal data against unauthorized or unlawful processing, accidental loss, destruction, or damage.
                        </Typography>
                    </Box>

                    <Box sx={{ mt: 4 }}>
                        <Typography variant="h5" gutterBottom>
                            4. Your Rights
                        </Typography>
                        <Typography variant="body1" paragraph>
                            You have the right to:
                        </Typography>
                        <ul>
                            <li>Access your personal data</li>
                            <li>Correct inaccurate data</li>
                            <li>Request deletion of your data</li>
                            <li>Object to processing of your data</li>
                            <li>Data portability</li>
                        </ul>
                    </Box>

                    <Box sx={{ mt: 4 }}>
                        <Typography variant="h5" gutterBottom>
                            5. Contact Us
                        </Typography>
                        <Typography variant="body1" paragraph>
                            If you have any questions about this Privacy Policy, please contact us at:
                        </Typography>
                        <Typography variant="body1">
                            Email: info@f13.tech
                        </Typography>
                    </Box>
                </Paper>
            </Container>
        </DashboardContent>
    );
} 