const express = require('express')
const axios = require("axios");
const cheerio = require("cheerio");
var helmet = require('helmet');
const PORT = process.env.PORT || 5000

async function searchWord(word = 'Buch') {
  const formattedWord = word.charAt(0).toUpperCase() + word.slice(1);
  const searchUrl = "https://www.duden.de/suchen/dudenonline/" + formattedWord;
  const { data } = await axios(searchUrl, { responseType: "text" }).catch(() => {
    throw 'That did not work 🙃, but we are to blame, not you 🙂. Notify the creator please 🙏 Twitter: @jdjuan'
  });
  try {
    $ = cheerio.load(data);
    const title = $(".vignette__label strong").contents().first().text();
    const description = $(".vignette__snippet").contents().first().text();
    const gender = description.split(", ")[1].split(" ")[0];
    const response = { title, gender, description: description.trim() };
    return response;
  } catch (error) {
    throw 'We could not find the word you were looking for 🤓';
  }
}

express()
  .use(helmet())
  .get("/search/:word", async ({ params }, res) => {
    console.log('======================');
    const word = params.word;
    let error;
    let response;
    try {
      response = await searchWord(word)
    } catch (error) {
      response = error;
      console.log(error);
    }
    res.status(200).send({
      success: "true",
      response,
      error
    });
  })
  .get('/', (req, res) => res.redirect('/search/buch'))
  .listen(PORT, () => console.log(`Listening on ${PORT}`))
