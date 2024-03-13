const express = require("express");
const axios = require("axios");

const app = express();
const PORT = process.env.PORT || 3000;

const API_KEY =
  "sk_prod_TfMbARhdgues5AuIosvvdAC9WsA5kXiZlW8HZPaRDlIbCpSpLsXBeZO7dCVZQwHAY3P4VSBPiiC33poZ1tdUj2ljOzdTCCOSpUZ_3912"; // Replace 'your-api-key' with your actual API key
const BASE_URL = "https://api.fillout.com/v1/api/forms";

app.get("/:formId/filteredResponses", async (req, res) => {
  try {
    const formId = req.params.formId;
    const {
      limit,
      afterDate,
      beforeDate,
      offset,
      status,
      includeEditLink,
      sort,
      filters,
    } = req.query;

    const url = `${BASE_URL}/${formId}/submissions`;

    const headers = {
      Authorization: `Bearer ${API_KEY}`,
    };

    let params = {
      limit,
      afterDate,
      beforeDate,
      offset,
      status,
      includeEditLink,
      sort,
      filters,
    };

    if (params.filters) {
      params = {
        limit: 150, //get all possible results, to make our own pagination values
        afterDate,
        beforeDate,
        offset,
        status,
        includeEditLink,
        sort,
        filters,
      };
      const response = await axios.get(url, { headers, params });
      let allResponses = [];

      for (let i = 0; i < response.data.totalResponses; i++) {
        allResponses.push(response.data.responses[i]);
      }
      let offsetMultiplier = 1;
      if (response.data.totalResponses > 150) {
        for (
          let j = 0;
          j < Math.ceil((response.data.totalResponses - 150) / 150);
          j++
        ) {
          params = {
            limit: 150,
            afterDate,
            beforeDate,
            offset: 150 * offsetMultiplier,
            status,
            includeEditLink,
            sort,
            filters,
          };
          let newResponse = await axios.get(url, { headers, params });
          for (let k = 0; k < newResponse.data.totalResponses; k++) {
            allResponses.push(newResponse.data.responses[i]);
          }
          offsetMultiplier += 1;
        }
      }

      console.log("all pages: ", response.data.pageCount);
      console.log("total: ", response.data.totalResponses);

      let allFilters = filters;
      if (typeof filters == "string") {
        let filtersString = filters;
        console.log(filtersString);

        let jsonBody = filtersString.slice(1, -1);

        let jsonArrayString = "[" + jsonBody + "]";

        allFilters = JSON.parse(jsonArrayString);
      }

      const filteredResponses = allResponses.filter((response) => {
        let filtersMatched = 0;
        allFilters.forEach((filter) => {
          response.questions.forEach((question) => {
            if (question.id == filter.id) {
              if (filter.condition == "equals") {
                if (question.value == filter.value) {
                  filtersMatched += 1;
                }
              }
              if (filter.condition == "does_not_equal") {
                if (question.value != filter.value) {
                  filtersMatched += 1;
                }
              }
              if (filter.condition == "less_than") {
                if (question.value < filter.value) {
                  filtersMatched += 1;
                }
              }
              if (filter.condition == "greater_than") {
                if (question.value > filter.value) {
                  filtersMatched += 1;
                }
              }
            }
          });
        });
        if (filtersMatched == allFilters.length) {
          console.log("returned response: ", response);
          return true;
        }
        return false;
      });

      let totalResponses = filteredResponses.length;
      let pageCount = Math.ceil(filteredResponses.length / limit) || 1;
      res.json({
        responses: filteredResponses.slice(0, limit),
        pageCount: pageCount,
        totalResponses: totalResponses,
      });
    } else {
      const response = await axios.get(url, { headers, params });
      res.json(response.data);
    }
  } catch (error) {
    console.error("Error fetching and filtering form submissions:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
