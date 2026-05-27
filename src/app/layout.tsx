import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
	title: "Team Defy_404",
	description: "Experience the future of physics-based Venturi Simulation - Verification of Bernoulli's equation. This was done by team Defy_404 for steamified hackathon, we hope you enjoy it!",
};

export default function RootLayout({
	children,
}: {
    children: React.ReactNode;
}) {
	return (
		<html lang="en">
			<body className={inter.className}>{children}</body>
		</html>
	);
}
