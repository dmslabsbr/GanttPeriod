# GanttPeriod Pro 📅

[![English](https://img.shields.io/badge/Language-English-blue)](README.md)

**GanttPeriod Pro** é uma ferramenta de alta performance para cálculo de prazos, períodos e concomitâncias (sobreposições). Desenvolvida para profissionais que precisam de precisão em relatórios que exigem a distinção entre dias brutos e dias líquidos (sem redundância).

## ✨ Funcionalidades Principais

- **Gráfico de Gantt Dinâmico**: Visualização clara dos períodos com destaque automático para zonas de sobreposição (áreas vermelhas).
- **Navegação Avançada**:
  - **Zoom e Pan**: Utilize o scroll do mouse para aproximar/afastar e clique-e-arraste para navegar pela linha do tempo.
  - **Mudança de Escala**: Alterne rapidamente entre visualizações Automática, Mensal ou Anual.
- **Resumo Profissional Detalhado**: Gera automaticamente um texto pronto para copiar com:
  - Datas de início, fim e duração de cada período.
  - Detalhamento de quantos dias são concomitantes com cada um dos outros períodos.
  - Cálculos finais: Dias Brutos, Dias Concomitantes e **Total Líquido**.
- **Histórico Inteligente**: Sugere nomes de períodos usados anteriormente em qualquer campo de entrada.
- **Privacidade e Persistência**: Os dados são salvos apenas no navegador do usuário (LocalStorage).
- **Pronto para Docker**: Suba o ambiente em segundos.
- **GitHub Pages**: Implantação automática via GitHub Actions.

## 🚀 Como Instalar e Executar

### Opção 1: GitHub Pages (Mais Fácil)
Após subir o código para seu repositório no GitHub:
1. Vá em **Settings** > **Pages** no seu repositório.
2. Em **Build and deployment** > **Source**, selecione **GitHub Actions**.
3. O app será publicado automaticamente sempre que você fizer um push para a branch `main`.

### Opção 2: Docker (Local)
1. Clone este repositório.
2. Dê permissão de execução ao script:
   ```bash
   chmod +x executar.sh
   ```
3. Execute o script:
   ```bash
   ./executar.sh
   ```
4. Acesse a aplicação no navegador em:
   [http://localhost:8080](http://localhost:8080)

## 🛠️ Tecnologias Utilizadas

- **React 18** + **Vite**
- **Tailwind CSS** (Tema Sleek Interface)
- **Lucide React** (Ícones)
- **Framer Motion** (Animações)
- **Docker** + **Nginx** (Containerização otimizada)

---

## 📄 Licença
Este projeto está sob a licença Apache-2.0.

---
[Ver versão em Inglês (README.md)](README.md)
