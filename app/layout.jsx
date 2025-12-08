import { Geist, Geist_Mono } from 'next/font/google'
import './globals.css'
import { Providers } from "./provider";
import { icons } from 'lucide-react';
const _geist = Geist({ subsets: ["latin"] });
const _geistMono = Geist_Mono({ subsets: ["latin"] });

export const metadata = {
  title: 'Cognilabs Admin Dashboard',
  icons: {
    icon: '/logo.png',
  },
}

export default function RootLayout({
  children,
}) {
  return (
    <html lang="en">
      <body className={`font-sans antialiased`}>
        <Providers>
          {children}
        </Providers>  
      </body>
    </html>
  )
}
