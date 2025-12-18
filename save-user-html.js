// Save user's HTML for testing
const userHTML = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Genexus Sourcing - Company Profile</title>
    <!-- Fonts -->
    <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@300;400;600;700;800&family=Open+Sans:wght@400;600&display=swap" rel="stylesheet">
    <!-- Icons -->
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    
    <style>
        :root {
            /* Brand Colors from Naming Convention */
            --brand-red: #f80000;       /* G */
            --brand-blue: #0c5492;      /* enex */
            --brand-green: #08A04B;     /* us, tagline */
            --brand-orange: #FFA500;    /* S */
            --brand-teal: #0d333b;      /* ourcing */
            --bg-sky: #bae6fd;          /* light sky blue bg-sky-200 approx */
            
            /* Text Colors */
            --text-dark: #1a1a1a;
            --text-grey: #4a5568;
            --text-light: #ffffff;

            /* Dimensions */
            --a4-width: 210mm;
            --a4-height: 296mm; /* Slight reduction to ensure fit */
        }

        * {
            box-sizing: border-box;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
        }

        body {
            margin: 0;
            padding: 0;
            font-family: 'Open Sans', sans-serif;
            background-color: #f0f0f0;
            color: var(--text-dark);
        }

        h1, h2, h3, h4, h5, h6 {
            font-family: 'Montserrat', sans-serif;
            margin: 0;
        }

        /* Logo Text Styling */
        .logo-text {
            font-family: 'Montserrat', sans-serif;
            font-weight: 800;
            text-transform: uppercase;
            letter-spacing: -0.5px;
        }
        .l-G { color: var(--brand-red); }
        .l-enex { color: var(--brand-blue); }
        .l-us { color: var(--brand-green); }
        .l-S { color: var(--brand-orange); }
        .l-ourcing { color: var(--brand-teal); }
    </style>
</head>
<body>
    <h1>Company Profile Sample</h1>
    <p>This is a simplified test of the Genexus Sourcing profile.</p>
    
    <h2><i class="fas fa-eye"></i> Our Vision</h2>
    <p>"To become India's most trusted MSME empowerment partner."</p>
    
    <h2><i class="fas fa-bullseye"></i> Our Mission</h2>
    <p>"To provide MSMEs with accessible financing and support."</p>
    
    <h3><i class="fas fa-handshake"></i> Partnership Model</h3>
    <p>We work with MSMEs as partners.</p>
    
    <div style="display: flex; gap: 20px;">
        <div style="background: var(--bg-sky); padding: 15px;">
            <h4 style="color: var(--brand-blue);"><i class="fas fa-rupee-sign"></i> EMD Financing</h4>
            <p>Fast, flexible financing for tenders.</p>
        </div>
        <div style="background: #fff7ed; padding: 15px;">
            <h4 style="color: var(--brand-orange);"><i class="fas fa-truck-loading"></i> Material Sourcing</h4>
            <p>Competitive prices on materials.</p>
        </div>
    </div>
    
    <ul>
        <li><i class="fas fa-check"></i> Quick Approval (72 hours)</li>
        <li><i class="fas fa-chart-line"></i> Growth Focused</li>
        <li><i class="fas fa-shield-alt"></i> Compliance Support</li>
    </ul>
    
    <p><i class="fas fa-phone-alt"></i> <strong>94395 78255</strong></p>
    <p><i class="fas fa-envelope"></i> <strong>info@genexussourcing.com</strong></p>
    <p><i class="fas fa-map-marker-alt"></i> A5/601, Gardenia Glory, Sector-46, Noida - 201301</p>
</body>
</html>`;

require('fs').writeFileSync('./user-sample.html', userHTML);
console.log('✅ Saved user-sample.html');
