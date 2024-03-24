const fs = require('fs');
const path = require('path');
const marked = require('marked');
const axios = require('axios');
const cheerio = require('cheerio');
const { URL } = require('url');

const directoryPath = '../../data/meetup';

// Read all files in the directory
fs.readdir(directoryPath, async (err, files) => {
  if (err) {
    console.error('Error reading directory:', err);
    return;
  }

  // Filter Markdown files
  const markdownFiles = files.filter((file) => path.extname(file) === '.md');

  // Check URL in each Markdown file
  for (const file of markdownFiles) {
    const filePath = path.join(directoryPath, file);

    try {
      const data = fs.readFileSync(filePath, 'utf8');

      // Parse Markdown content
      const parsedContent = marked.lexer(data);

      // Find the URL property
      const urlToken = parsedContent.find(
        (token) => token.type === 'paragraph' && token.text.includes('url:')
      );

      if (urlToken) {
        // Extract and validate the URL
        const urlMatch = urlToken.text.match(/url:\s*'([^']+)'/);
        if (urlMatch) {
          const urlValue = urlMatch[1].trim();
          const urlObject = new URL(urlValue);

          if (urlObject.hostname === 'www.meetup.com') {
            // Make an HTTP request to get the page title
            const response = await axios.get(urlValue);
            const $ = cheerio.load(response.data);
            const pageTitle = $('h1').text();

            if (pageTitle === 'Group not found') {
              console.log(
                `Deleting file ${file} as the page title is "${pageTitle}"`
              );
              fs.unlinkSync(filePath);
            } else {
              console.log(`Page title is not "Group not found" in ${file}`);
            }
          } else {
            console.log(`Invalid domain in ${file}: ${urlValue}`);
          }
        } else {
          console.log(`Invalid URL format in ${file}`);
        }
      } else {
        console.log(`No URL property found in ${file}`);
      }
    } catch (error) {
      console.error(`Error processing file ${file}:`, error.message);
    }
  }
});
