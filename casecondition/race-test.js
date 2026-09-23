// // // // // race-test.js

// // // // import axios from "axios";

// // // // const payload = {
// // // //     "fullName": "Bhiwadi, Tijara, Rajasthan, India",
// // // //     "id": "350157",
// // // //   CheckInDate: "06/10/2026",
// // // //   CheckOutDate: "06/11/2026",
// // // //   RoomCount: 1,
// // // // };

// // // // async function run() {

// // // //   const requests = [];

// // // //   for (let i = 0; i < 20; i++) {

// // // //     requests.push(
// // // //       axios.post(
// // // //         "http://localhost:8000/api/v1/Hotels/search",
// // // //         payload
// // // //       )
// // // //     );
// // // //   }

// // // //   await Promise.all(requests);

// // // //   console.log("✅ ALL REQUESTS DONE");
// // // // }

// // // // run();

// // // import axios from "axios";

// // // async function run() {
// // //   const requests = [];

// // //  for (let i = 0; i < 50; i++) {

// // //   const checkIn = new Date();

// // //   checkIn.setDate(checkIn.getDate() + i + 1);

// // //   const checkOut = new Date(checkIn);

// // //   checkOut.setDate(checkOut.getDate() + 1);

// // //   const formatDate = (date) => {
// // //     const month = String(date.getMonth() + 1).padStart(2, "0");
// // //     const day = String(date.getDate()).padStart(2, "0");
// // //     const year = date.getFullYear();

// // //     return `${month}/${day}/${year}`;
// // //   };

// // //   const payload = {
// // //     fullName: "Bhiwadi, Tijara, Rajasthan, India",
// // //     id: "350157",
// // //     CheckInDate: formatDate(checkIn),
// // //     CheckOutDate: formatDate(checkOut),
// // //     RoomCount: (i % 3) + 1,
// // //   };

// // //   requests.push(
// // //     axios.post(
// // //       "http://localhost:8000/api/v1/Hotels/search",
// // //       payload
// // //     )
// // //   );
// // // }

// // //   await Promise.all(requests);

// // //   console.log("✅ ALL REQUESTS DONE");
// // // }

// // // run();

// // import axios from "axios";

// // const URL =
// //   "http://localhost:8000/api/v1/Seacrhcity/destination-search";

// // const payload = {
// //   SearchInput: "udaipur",
// // };

// // async function run() {
// //   let success = 0;
// //   let failed = 0;

// //   const startTime = Date.now();

// //   const requests = [];

// //   for (let i = 0; i < 50; i++) {
// //     requests.push(
// //       axios
// //         .post(URL, payload)
// //         .then((res) => {
// //           success++;
// //           return res.data;
// //         })
// //         .catch((err) => {
// //           failed++;
// //           console.log(`❌ Request ${i + 1} Failed:`, err.message);
// //         })
// //     );



    
// //     // 30 sec me 100 requests
// //     await Promise.allSettled(requests);
// //   }

// //   await Promise.all(requests);

// //   const totalTime = ((Date.now() - startTime) / 1000).toFixed(2);

// //   console.log("\n========== RESULT ==========");
// //   console.log(`✅ Success : ${success}`);
// //   console.log(`❌ Failed  : ${failed}`);
// //   console.log(`📤 Total Requests : ${success + failed}`);
// //   console.log(`⏱ Total Time : ${totalTime} sec`);
// // }

// // run();

// import axios from "axios";

// const URL =
//   "http://uat.flyshop.in/HotelHost/HotelNewAPIService.svc/JSONService/HotelSearchbyName";

// const payload = {
//   AuthHeader: {
//     IPAddress: "1",
//     Password: "01ED6B7F54BCF0BDB8F6C910974377AAB7D52AC2",
//     RequestId: "123120241841301",
//     UserId: "panjourneyuat",
//   },
//   SearchInput: "Jaipur",
// };

// async function run() {
//   let success = 0;
//   let failed = 0;

//   console.time("LOAD_TEST");

//   const requests = [];

//   for (let i = 0; i < 50; i++) {
//     requests.push(
//       axios
//         .post(URL, payload, {
//           timeout: 30000, // 30 sec
//           headers: {
//             "Content-Type": "application/json",
//           },
//         })
//         .then((res) => {
//           success++;

//           if (i < 3) {
//             console.log(
//               `✅ ${i + 1}`,
//               res.status,
//               JSON.stringify(res.data).substring(0, 200)
//             );
//           }
//         })
//         .catch((err) => {
//           failed++;

//           console.log(
//             `❌ ${i + 1}`,
//             err.response?.status || "NO_STATUS",
//             err.code || "",
//             err.message
//           );
//         })
//     );
//   }

//   await Promise.allSettled(requests);

//   console.timeEnd("LOAD_TEST");

//   console.log("\n========== RESULT ==========");
//   console.log(`✅ Success : ${success}`);
//   console.log(`❌ Failed  : ${failed}`);
//   console.log(`📤 Total Requests : ${success + failed}`);
//   console.log(
//     `📉 Error Rate : ${(
//       (failed / (success + failed)) *
//       100
//     ).toFixed(2)}%`
//   );
// }

// run();


import axios from "axios";

const URL =
  "http://localhost:8000/api/v1/Seacrhcity/destination-search";

const payload = {
  SearchInput: "udaipur",
};

const TOTAL_REQUESTS = 10000;
const CONCURRENCY = 300;

async function makeRequest(id) {
  const start = Date.now();

  try {
    const res = await axios.post(URL, payload, {
      timeout: 30000,
    });

    return {
      success: true,
      status: res.status,
      time: Date.now() - start,
    };
  } catch (err) {
    return {
      success: false,
      status: err.response?.status,
      time: Date.now() - start,
      error: err.message,
    };
  }
}

async function run() {
  console.time("LOAD_TEST");

  const results = [];

  for (let i = 0; i < TOTAL_REQUESTS; i += CONCURRENCY) {
    const batch = [];

    for (
      let j = i;
      j < Math.min(i + CONCURRENCY, TOTAL_REQUESTS);
      j++
    ) {
      batch.push(makeRequest(j + 1));
    }

    const batchResults = await Promise.all(batch);

    results.push(...batchResults);

    console.log(
      `Completed ${results.length}/${TOTAL_REQUESTS}`
    );
  }

  console.timeEnd("LOAD_TEST");

  const success = results.filter((r) => r.success);
  const failed = results.filter((r) => !r.success);

  const times = success.map((r) => r.time);

  const avg =
    times.reduce((a, b) => a + b, 0) / times.length;

  const min = Math.min(...times);
  const max = Math.max(...times);

  console.log("\n========== RESULT ==========");
  console.log(`📤 Total Requests : ${TOTAL_REQUESTS}`);
  console.log(`✅ Success : ${success.length}`);
  console.log(`❌ Failed  : ${failed.length}`);
  console.log(
    `📉 Error Rate : ${(
      (failed.length / TOTAL_REQUESTS) *
      100
    ).toFixed(2)}%`
  );

  console.log(`⚡ Avg Response : ${avg.toFixed(2)} ms`);
  console.log(`🚀 Fastest : ${min} ms`);
  console.log(`🐢 Slowest : ${max} ms`);
}

run();