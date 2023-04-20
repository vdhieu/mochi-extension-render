// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import { renderChartImage } from "@/utils/render-chart";
import axios from "axios";
import type { NextApiRequest, NextApiResponse } from "next";
import _ from "lodash";
import { getChartColorConfig } from "@/utils/canvas/color";

type Data = {
  markdown?: string;
  error?: string;
  base_coin?: any;
};

// @ts-ignore
async function fetcherTicker(
  token: string,
  interval: string,
  currency: string = "usd",
) {
  const {
    data: { data },
  } = await axios.get(
    `https://api.mochi.pod.town/api/v1/defi/coins/compare?base=${token}&interval=${interval}&target=${currency}`,
  );
  if (data.base_coin_suggestions) {
    return fetcherTicker(data.base_coin_suggestions[0].id, interval, currency);
  }
  return data;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Data>,
) {
  const {
    token,
    size = "large",
    time_step = 7,
    currency = "usd",
    theme = "dark",
  } = req.query;
  try {
    const { from, to, times, ratios, base_coin } = await fetcherTicker(
      token as string,
      time_step as string,
      currency as string,
    );

    const img = await renderChartImage({
      chartLabel: [
        // @ts-ignore
        `${_.upperCase(token)}/${_.upperCase(currency)}`,
        `${from} → ${to}`,
      ].join(" | "),
      labels: times,
      data: ratios,
      theme: theme as any,
      size: size as any,
      colorConfig: getChartColorConfig(base_coin.id) as any,
    });
    res.status(200).json({
      markdown: `![](data:image/png;base64,${img.toString("base64")})`,
      base_coin: {
        id: base_coin.id,
        symbol: base_coin.symbol,
        image: base_coin.image?.small,
        name: base_coin.name,
        asset_platform_id: base_coin.asset_platform_id,
        description: base_coin.description.en,
        market_data: {
          current_price: base_coin.market_data.current_price.usd,
          market_cap: base_coin.market_data.market_cap.usd,
          percentage_1h:
            base_coin.market_data.price_change_percentage_1h_in_currency.usd,
          percentage_24h:
            base_coin.market_data.price_change_percentage_24h_in_currency.usd,
          percentage_7d:
            base_coin.market_data.price_change_percentage_7d_in_currency.usd,
        },
      },
    });
  } catch (err) {
    console.error(
      `[Ticker] token=${token} currency=${currency} time=${time_step} `,
      err,
    );

    res.status(400).json({ error: "internal server error" });
  }
}
