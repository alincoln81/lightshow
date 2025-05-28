// processor.js – helper to stagger disconnects in ~100-user / 100-ms chunks
module.exports = {
    /**
     * Waits N milliseconds before finishing the scenario,
     * where N ∈ {0, 100, 200, …, 900}.
     *
     * Artillery gives every VU a unique number (`context.vars.vu`).
     * By mod-100, we make 100 users share each delay bucket.
     */
    staggerDisconnect: function (context, events, done) {
      const vuIndex = context.vars.vu || Math.floor(Math.random() * 1000);
      const delayMs = (vuIndex % 10) * 100; // 0–900 ms in 100-ms steps
      setTimeout(done, delayMs);
    }
  };
  