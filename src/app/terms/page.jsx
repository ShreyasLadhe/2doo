'use client';

import { Container, Typography, Paper, Box, Breadcrumbs, Link } from '@mui/material';
import { paths } from 'src/routes/paths';
import { RouterLink } from 'src/routes/components';
import { DashboardContent } from 'src/layouts/dashboard';

export default function TermsPage() {
    return (
        <DashboardContent>
            <Container maxWidth="lg" sx={{ py: 5 }}>
                <Breadcrumbs sx={{ mb: 3 }}>
                    <Link component={RouterLink} href="/" color="inherit">
                        Home
                    </Link>
                    <Typography color="text.primary">Terms and Conditions</Typography>
                </Breadcrumbs>

                <Paper sx={{ p: { xs: 3, md: 5 } }}>
                    <Typography variant="h3" component="h1" gutterBottom>
                        Terms and Conditions
                    </Typography>

                    <Typography variant="body1" paragraph>
                        Last updated: {new Date().toLocaleDateString()}
                    </Typography>

                    <Box sx={{ mt: 4 }}>
                        <Typography variant="h5" gutterBottom>
                            1. Acceptance of Terms
                        </Typography>
                        <Typography variant="body1" paragraph>
                            By accessing and using 2doo, you accept and agree to be bound by the terms and provision of this agreement.
                        </Typography>
                    </Box>

                    <Box sx={{ mt: 4 }}>
                        <Typography variant="h5" gutterBottom>
                            2. Use License
                        </Typography>
                        <Typography variant="body1" paragraph>
                            Permission is granted to temporarily use 2doo for personal, non-commercial transitory viewing only. This is the grant of a license, not a transfer of title, and under this license you may not:
                        </Typography>
                        <ul>
                            <li>Modify or copy the materials</li>
                            <li>Use the materials for any commercial purpose</li>
                            <li>Attempt to decompile or reverse engineer any software contained in 2doo</li>
                            <li>Remove any copyright or other proprietary notations from the materials</li>
                        </ul>
                    </Box>

                    <Box sx={{ mt: 4 }}>
                        <Typography variant="h5" gutterBottom>
                            3. User Account
                        </Typography>
                        <Typography variant="body1" paragraph>
                            To use certain features of 2doo, you must register for an account. You agree to:
                        </Typography>
                        <ul>
                            <li>Provide accurate and complete information</li>
                            <li>Maintain the security of your account</li>
                            <li>Promptly update any changes to your information</li>
                            <li>Accept responsibility for all activities under your account</li>
                        </ul>
                    </Box>

                    <Box sx={{ mt: 4 }}>
                        <Typography variant="h5" gutterBottom>
                            4. Service Modifications
                        </Typography>
                        <Typography variant="body1" paragraph>
                            2doo reserves the right to withdraw or amend our service, and any service or material we provide, in our sole discretion without notice. We will not be liable if, for any reason, all or any part of the service is unavailable at any time or for any period.
                        </Typography>
                    </Box>

                    <Box sx={{ mt: 4 }}>
                        <Typography variant="h5" gutterBottom>
                            5. Limitation of Liability
                        </Typography>
                        <Typography variant="body1" paragraph>
                            In no event shall 2doo, nor any of its officers, directors, and employees, be liable to you for anything arising out of or in any way connected with your use of this service, whether such liability is under contract, tort, or otherwise.
                        </Typography>
                    </Box>

                    <Box sx={{ mt: 4 }}>
                        <Typography variant="h5" gutterBottom>
                            6. Contact Information
                        </Typography>
                        <Typography variant="body1" paragraph>
                            If you have any questions about these Terms and Conditions, please contact us at:
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