import axios from 'axios';
import * as cheerio from 'cheerio';
import { type Card } from '../types/cardType';
import { mapToCard } from '../utils/mapToCard'; // Asegúrate de tener esta función

export interface TopCommander extends Card {
  rank: number;
  decks: number;
  decksFormatted: string;
  saltScore?: number;
}

export const fetchTopCommandersFromEDHREC = async (limit = 20): Promise<TopCommander[]> => {
  try {
    const proxyUrl = 'https://api.allorigins.win/raw?url=';
    const response = await axios.get(proxyUrl + encodeURIComponent('https://edhrec.com/commanders'));

    const html = response.data;
    const $ = cheerio.load(html);

    const commanders: TopCommander[] = [];

    $('.Card_container__').each((i, container) => {
      if (i >= limit) return false;

      const $container = $(container);

      const rankSpan = $container.find('span:contains("Rank #")');
      const rankText = rankSpan.text().trim();
      const rankMatch = rankText.match(/Rank #(\d+)/i);
      const rank = rankMatch ? parseInt(rankMatch[1], 10) : i + 1;

      let name = $container.find('[class*="card_name"]').text().trim();
      console.log(name);
      if (!name) {
        name = $container.find('img').attr('alt')?.trim() || '';
      }
      if (!name) return;

      let decksFormatted = '';
      let decks = 0;
      const decksText = $container.text().match(/(\d{1,3}(?:,\d{3})*)\s*decks?/i);
      if (decksText) {
        decksFormatted = decksText[0];
        decks = parseInt(decksText[1].replace(/,/g, ''), 10);
      }

      let saltScore: number | undefined;
      const saltMatch = $container.text().match(/Salt Score:\s*(\d+\.\d+)/i);
      if (saltMatch) saltScore = parseFloat(saltMatch[1]);

      commanders.push({
        id: `edhrec-${rank}`,
        name,
        rank,
        decks,
        decksFormatted: decksFormatted || 'Sin datos',
        saltScore,
      } as TopCommander);
    });

    const fullResults: TopCommander[] = [];
    for (const cmd of commanders) {
      try {
        let res;
        try {
          res = await axios.get('https://api.scryfall.com/cards/named', {
            params: { exact: cmd.name, lang: 'es' },
          });
        } catch {
          res = await axios.get('https://api.scryfall.com/cards/named', {
            params: { exact: cmd.name },
          });
        }

        if (res.data?.id) {
          const card = mapToCard(res.data);
          fullResults.push({
            ...card,
            rank: cmd.rank,
            decks: cmd.decks,
            decksFormatted: cmd.decksFormatted,
            saltScore: cmd.saltScore,
          });
        }
      } catch (err) {
        console.warn(`Falló Scryfall para ${cmd.name} || ${(err as Error).message}`);
      }
    }

    console.log(`Scraped ${fullResults.length} comandantes dinámicos de EDHREC`);
    console.log('Ejemplos:', fullResults.slice(0, 3).map(c => `${c.rank} - ${c.name} - ${c.decksFormatted}`));

    return fullResults;
  } catch (error) {
    console.error('Error scraping EDHREC:', error);
    return [];
  }
};