const axios = require('axios');
const fs = require('fs');
const path = require('path');
const FormData = require('form-data');

class PDFMicroserviceClient {
  constructor() {
    this.baseURL = process.env.PDF_SERVICE_URL || 'http://localhost:8000';
  }

  async convertPdfToWord(inputPath, outputPath) {
    try {
      console.log('🔄 Converting PDF to Word using Python microservice...');
      
      const formData = new FormData();
      formData.append('file', fs.createReadStream(inputPath));

      const response = await axios.post(`${this.baseURL}/api/pdf-to-word`, formData, {
        headers: {
          ...formData.getHeaders(),
        },
        responseType: 'stream'
      });

      // Save the converted file
      const writer = fs.createWriteStream(outputPath);
      response.data.pipe(writer);

      return new Promise((resolve, reject) => {
        writer.on('finish', () => {
          console.log('✅ PDF to Word conversion completed using Python microservice');
          resolve();
        });
        writer.on('error', reject);
      });

    } catch (error) {
      console.error('❌ Python microservice conversion failed:', error.message);
      throw error;
    }
  }

  async convertPdfToExcel(inputPath, outputPath) {
    try {
      console.log('🔄 Converting PDF to Excel using Python microservice...');
      
      const formData = new FormData();
      formData.append('file', fs.createReadStream(inputPath));

      const response = await axios.post(`${this.baseURL}/api/pdf-to-excel`, formData, {
        headers: {
          ...formData.getHeaders(),
        },
        responseType: 'stream'
      });

      // Save the converted file
      const writer = fs.createWriteStream(outputPath);
      response.data.pipe(writer);

      return new Promise((resolve, reject) => {
        writer.on('finish', () => {
          console.log('✅ PDF to Excel conversion completed using Python microservice');
          resolve();
        });
        writer.on('error', reject);
      });

    } catch (error) {
      console.error('❌ Python microservice conversion failed:', error.message);
      throw error;
    }
  }

  async convertPdfToPowerPoint(inputPath, outputPath) {
    try {
      console.log('🔄 Converting PDF to PowerPoint using Python microservice...');
      
      const formData = new FormData();
      formData.append('file', fs.createReadStream(inputPath));

      const response = await axios.post(`${this.baseURL}/api/pdf-to-ppt`, formData, {
        headers: {
          ...formData.getHeaders(),
        },
        responseType: 'stream'
      });

      // Save the converted file
      const writer = fs.createWriteStream(outputPath);
      response.data.pipe(writer);

      return new Promise((resolve, reject) => {
        writer.on('finish', () => {
          console.log('✅ PDF to PowerPoint conversion completed using Python microservice');
          resolve();
        });
        writer.on('error', reject);
      });

    } catch (error) {
      console.error('❌ Python microservice conversion failed:', error.message);
      throw error;
    }
  }

  async checkHealth() {
    try {
      console.log('🔍 Checking Python microservice health...');
      const response = await axios.get(`${this.baseURL}/health`, {
        timeout: 5000, // 5 second timeout
        headers: {
          'User-Agent': 'PDFForge-NodeJS-Client/1.0'
        }
      });
      console.log('✅ Python microservice is healthy:', response.data);
      return response.data;
    } catch (error) {
      console.log('❌ Python microservice health check failed:', error.message);
      if (error.code === 'ECONNREFUSED') {
        throw new Error('Python microservice is not running');
      } else if (error.code === 'ECONNABORTED') {
        throw new Error('Python microservice timeout - service may be busy');
      } else {
        throw new Error(`Python microservice error: ${error.message}`);
      }
    }
  }
}

module.exports = PDFMicroserviceClient;
