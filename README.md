# Funnel Maker

A modern, professional sales funnel builder built with Next.js 15, React 19, and Tailwind CSS. Create high-converting sales funnels with an intuitive drag-and-drop interface.

## ✨ Features

- **Visual Funnel Builder**: Create funnels with an intuitive drag-and-drop interface
- **Pre-built Templates**: Choose from popular funnel templates (Lead Generation, Product Sales, Webinar)
- **Step Management**: Add, remove, and reorder funnel steps easily
- **Conversion Analytics**: View estimated conversion rates and revenue projections
- **Responsive Design**: Fully responsive interface that works on all devices
- **Modern Tech Stack**: Built with Next.js 15, React 19, and Tailwind CSS
- **TypeScript**: Fully typed for better development experience

## 🚀 Getting Started

### Prerequisites

- Node.js 18 or higher
- npm, yarn, or pnpm

### Installation

1. Clone the repository:
```bash
git clone https://github.com/CF-LLC/funnel-maker.git
cd funnel-maker
```

2. Install dependencies:
```bash
npm install
# or
yarn install
# or
pnpm install
```

3. Run the development server:
```bash
npm run dev
# or
yarn dev
# or
pnpm dev
```

4. Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## 🏗️ Usage

### Creating a Funnel

1. Visit the homepage and click "Start Building Free"
2. Use the sidebar to add different types of steps:
   - **Landing Page**: Capture visitor attention
   - **Opt-in Page**: Collect contact information
   - **Sales Page**: Present your main offer
   - **Upsell Page**: Additional offers after purchase
   - **Thank You Page**: Confirm and deliver

3. Manage your funnel steps:
   - Reorder steps using up/down arrows
   - Remove steps with the delete button
   - Edit funnel name by clicking on the title

4. View estimated conversion metrics in real-time

### Funnel Step Types

- **Landing Page**: The entry point for your visitors
- **Opt-in Page**: Capture leads with forms and lead magnets
- **Sales Page**: Present your main product or service offer
- **Upsell Page**: Additional offers to increase average order value
- **Thank You Page**: Confirmation and delivery of purchased items

## 🛠️ Tech Stack

- **Framework**: Next.js 15
- **Frontend**: React 19
- **Styling**: Tailwind CSS
- **Language**: TypeScript
- **Icons**: Heroicons (via SVG)

## 📁 Project Structure

```
funnel-maker/
├── app/
│   ├── builder/
│   │   └── page.tsx          # Funnel builder interface
│   ├── globals.css           # Global styles
│   ├── layout.tsx           # Root layout
│   └── page.tsx             # Homepage
├── public/                  # Static assets
├── tailwind.config.ts       # Tailwind configuration
├── tsconfig.json           # TypeScript configuration
└── package.json            # Dependencies and scripts
```

## 🚀 Deployment

This application is ready for deployment on Vercel, Netlify, or any platform that supports Next.js:

### Deploy on Vercel

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/CF-LLC/funnel-maker)

### Manual Deployment

1. Build the application:
```bash
npm run build
```

2. Start the production server:
```bash
npm run start
```

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is open source and available under the [MIT License](LICENSE).

## 🎯 Roadmap

- [ ] Funnel templates library
- [ ] Page builder for individual steps
- [ ] Analytics dashboard
- [ ] Integration with email marketing platforms
- [ ] A/B testing capabilities
- [ ] User authentication and project management
- [ ] Export to HTML/CSS
- [ ] Custom domain support
