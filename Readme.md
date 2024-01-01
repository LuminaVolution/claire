# Claire Project: Comprehensive Web Scraping Solution

Welcome to the Claire Project, a cutting-edge web scraping solution designed to automate the collection of online data. This project encapsulates various scraperswithin a Dockerized environment for ease of use and deployment.

## Getting Started

### Prerequisites
- Docker and Docker Compose installed on your system.
- Basic knowledge of Docker operations.
- An active internet connection for Docker operations.

### Installation

1. **Clone the Project Repository:**
git clone https://github.com/your-username/claire.git
cd claire
2. **Start Services with Docker Compose:**
docker-compose up --build


### Project Structure
- scheduler: This service is responsible for periodically triggering the scrapers.
- Scrapers: A directory containing multiple scraper services, each designed to target specific websites or data sources.
Usage
- scraper-presse-citron: This scraper service targets the Presse-Citron website to extract news articles.

Once the services are up and running, the scheduler will automatically invoke the scraper services at predefined intervals. Additionally, scrapers can be manually triggered via HTTP requests when required.

### Manual Triggering scraper-presse-citron
Send an HTTP POST request to http://scraper-presse-citron:3000/trigger to manually trigger the Presse-Citron scraper.

### Features
- Automated Scraping: Scrapers are automatically invoked by the scheduler.
-Dockerized Services: Each scraper and the scheduler run in isolated Docker containers.
-Scalability: Easily add new scrapers to the project by defining them in the docker-compose.yml file.
-Robust Error Handling: The system is designed to handle errors gracefully and retry failed operations.

### Customization
Modify the docker-compose.yml to add new services or change existing configurations.
Update the scheduler's configuration to alter the triggering frequency of scrapers.

### Documentation
For detailed information about each scraper, refer to the README files located within their respective directories.

### Contribution
Feel free to fork this project, submit issues, and open pull requests to contribute to the improvement of the Claire Project.

### License
This project is licensed under the MIT License - see the LICENSE file for details.