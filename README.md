# GanttPeriod Pro 📅

[![Português](https://img.shields.io/badge/Language-Português-green)](README.pt-BR.md)

**GanttPeriod Pro** is a high-performance, serverless tool designed for calculating duration and concurrency (overlaps) between multiple time periods. It's ideal for professional reports, legal calculations, or project management where precise "net days" (non-redundant days) are required.

## ✨ Key Features

- **Dynamic Gantt Chart**: Visual representation of periods with automatic overlap highlighting (Red zones).
- **Advanced Navigation**:
  - **Zoom & Pan**: Use the mouse wheel to zoom into specific dates and click-and-drag to pan through the timeline.
  - **Scale Switching**: Toggle between Auto, Monthly, and Yearly scales.
- **Professional Summary**: Automatically generates a detailed report including:
  - Start/End dates and duration for each period.
  - Granular breakdown of concomitant days with other specific periods.
  - Total Gross Days vs. Concomitant Days vs. **Net Days**.
- **Smart History**: Remembers recently used period names for quick selection across all inputs.
- **Local Persistence**: All data is saved locally in your browser (LocalStorage).
- **Docker Ready**: Deploy easily using the pre-configured Docker environment.

## 🚀 Installation & Running

### Prerequisites
- [Docker](https://docs.docker.com/get-docker/)
- [Docker Compose](https://docs.docker.com/compose/install/)

### Quick Start
1. Clone the repository.
2. Grant execution permissions to the script:
   ```bash
   chmod +x executar.sh
   ```
3. Run the application:
   ```bash
   ./executar.sh
   ```
4. Access the application in your browser at:
   [http://localhost:8080](http://localhost:8080)

## 🛠️ Built With

- **React 18** + **Vite**
- **Tailwind CSS** (Sleek UI Theme)
- **Lucide React** (Icons)
- **Framer Motion** (Animations)
- **Docker** + **Nginx** (Production-ready containerization)

---

## 📄 License
This project is licensed under the Apache-2.0 License.

---
[Go to Portuguese Version (README.pt-BR.md)](README.pt-BR.md)
