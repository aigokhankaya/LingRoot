import { Html, Head, Main, NextScript } from 'next/document'

export default function Document() {
    return (
        <Html lang="tr">
            <Head>
                <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet" />
                <link rel="icon" href="/lingroot-icon.svg" />
            </Head>
            <body>
                <Main />
                <NextScript />
            </body>
        </Html>
    )
}
