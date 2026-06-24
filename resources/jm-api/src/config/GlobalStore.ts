const GlobalStore = {
    apiUrl: localStorage.getItem("apiUrl") || "",
    hostServer: JSON.parse(localStorage.getItem("hostServer") || "[]"),

    updateApiUrl(newApiUrl: string) {
        this.apiUrl = newApiUrl;
        localStorage.setItem("apiUrl", newApiUrl);
    },

    updateHostServer(newHostServer: any[]) {
        this.hostServer = newHostServer;
        localStorage.setItem("hostServer", JSON.stringify(newHostServer));
    },
};

export default GlobalStore;
