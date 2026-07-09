.class public Lcom/rnfs/Downloader;
.super Landroid/os/AsyncTask;
.source "Downloader.java"


# annotations
.annotation system Ldalvik/annotation/Signature;
    value = {
        "Landroid/os/AsyncTask<",
        "Lcom/rnfs/DownloadParams;",
        "[J",
        "Lcom/rnfs/DownloadResult;",
        ">;"
    }
.end annotation


# instance fields
.field private mAbort:Ljava/util/concurrent/atomic/AtomicBoolean;

.field private mParam:Lcom/rnfs/DownloadParams;

.field res:Lcom/rnfs/DownloadResult;


# direct methods
.method public constructor <init>()V
    .locals 2

    .line 18
    invoke-direct {p0}, Landroid/os/AsyncTask;-><init>()V

    .line 20
    new-instance v0, Ljava/util/concurrent/atomic/AtomicBoolean;

    const/4 v1, 0x0

    invoke-direct {v0, v1}, Ljava/util/concurrent/atomic/AtomicBoolean;-><init>(Z)V

    iput-object v0, p0, Lcom/rnfs/Downloader;->mAbort:Ljava/util/concurrent/atomic/AtomicBoolean;

    return-void
.end method

.method static synthetic access$000(Lcom/rnfs/Downloader;)Lcom/rnfs/DownloadParams;
    .locals 0

    .line 18
    iget-object p0, p0, Lcom/rnfs/Downloader;->mParam:Lcom/rnfs/DownloadParams;

    return-object p0
.end method

.method static synthetic access$100(Lcom/rnfs/Downloader;Lcom/rnfs/DownloadParams;Lcom/rnfs/DownloadResult;)V
    .locals 0
    .annotation system Ldalvik/annotation/Throws;
        value = {
            Ljava/lang/Exception;
        }
    .end annotation

    .line 18
    invoke-direct {p0, p1, p2}, Lcom/rnfs/Downloader;->download(Lcom/rnfs/DownloadParams;Lcom/rnfs/DownloadResult;)V

    return-void
.end method

.method private download(Lcom/rnfs/DownloadParams;Lcom/rnfs/DownloadResult;)V
    .locals 29
    .annotation system Ldalvik/annotation/Throws;
        value = {
            Ljava/lang/Exception;
        }
    .end annotation

    move-object/from16 v1, p0

    move-object/from16 v0, p1

    move-object/from16 v2, p2

    const/4 v3, 0x0

    .line 48
    :try_start_0
    iget-object v4, v0, Lcom/rnfs/DownloadParams;->src:Ljava/net/URL;

    invoke-virtual {v4}, Ljava/net/URL;->openConnection()Ljava/net/URLConnection;

    move-result-object v4

    check-cast v4, Ljava/net/HttpURLConnection;
    :try_end_0
    .catchall {:try_start_0 .. :try_end_0} :catchall_8

    .line 50
    :try_start_1
    iget-object v5, v0, Lcom/rnfs/DownloadParams;->headers:Lcom/facebook/react/bridge/ReadableMap;

    invoke-interface {v5}, Lcom/facebook/react/bridge/ReadableMap;->keySetIterator()Lcom/facebook/react/bridge/ReadableMapKeySetIterator;

    move-result-object v5

    .line 52
    :goto_0
    invoke-interface {v5}, Lcom/facebook/react/bridge/ReadableMapKeySetIterator;->hasNextKey()Z

    move-result v6

    if-eqz v6, :cond_0

    .line 53
    invoke-interface {v5}, Lcom/facebook/react/bridge/ReadableMapKeySetIterator;->nextKey()Ljava/lang/String;

    move-result-object v6

    .line 54
    iget-object v7, v0, Lcom/rnfs/DownloadParams;->headers:Lcom/facebook/react/bridge/ReadableMap;

    invoke-interface {v7, v6}, Lcom/facebook/react/bridge/ReadableMap;->getString(Ljava/lang/String;)Ljava/lang/String;

    move-result-object v7

    .line 55
    invoke-virtual {v4, v6, v7}, Ljava/net/HttpURLConnection;->setRequestProperty(Ljava/lang/String;Ljava/lang/String;)V

    goto :goto_0

    .line 58
    :cond_0
    iget v5, v0, Lcom/rnfs/DownloadParams;->connectionTimeout:I

    invoke-virtual {v4, v5}, Ljava/net/HttpURLConnection;->setConnectTimeout(I)V

    .line 59
    iget v5, v0, Lcom/rnfs/DownloadParams;->readTimeout:I

    invoke-virtual {v4, v5}, Ljava/net/HttpURLConnection;->setReadTimeout(I)V

    .line 60
    invoke-virtual {v4}, Ljava/net/HttpURLConnection;->connect()V

    .line 62
    invoke-virtual {v4}, Ljava/net/HttpURLConnection;->getResponseCode()I

    move-result v5

    .line 63
    invoke-direct {v1, v4}, Lcom/rnfs/Downloader;->getContentLength(Ljava/net/HttpURLConnection;)J

    move-result-wide v6

    const/16 v8, 0xc8

    const/4 v10, 0x0

    if-eq v5, v8, :cond_2

    const/16 v11, 0x12d

    if-eq v5, v11, :cond_1

    const/16 v11, 0x12e

    if-eq v5, v11, :cond_1

    const/16 v11, 0x133

    if-eq v5, v11, :cond_1

    const/16 v11, 0x134

    if-ne v5, v11, :cond_2

    :cond_1
    const/4 v11, 0x1

    goto :goto_1

    :cond_2
    const/4 v11, 0x0

    :goto_1
    if-eqz v11, :cond_3

    const-string v5, "Location"

    .line 76
    invoke-virtual {v4, v5}, Ljava/net/HttpURLConnection;->getHeaderField(Ljava/lang/String;)Ljava/lang/String;

    move-result-object v5

    .line 77
    invoke-virtual {v4}, Ljava/net/HttpURLConnection;->disconnect()V

    .line 79
    new-instance v6, Ljava/net/URL;

    invoke-direct {v6, v5}, Ljava/net/URL;-><init>(Ljava/lang/String;)V

    invoke-virtual {v6}, Ljava/net/URL;->openConnection()Ljava/net/URLConnection;

    move-result-object v5

    check-cast v5, Ljava/net/HttpURLConnection;
    :try_end_1
    .catchall {:try_start_1 .. :try_end_1} :catchall_7

    const/16 v4, 0x1388

    .line 80
    :try_start_2
    invoke-virtual {v5, v4}, Ljava/net/HttpURLConnection;->setConnectTimeout(I)V

    .line 81
    invoke-virtual {v5}, Ljava/net/HttpURLConnection;->connect()V

    .line 83
    invoke-virtual {v5}, Ljava/net/HttpURLConnection;->getResponseCode()I

    move-result v4

    .line 84
    invoke-direct {v1, v5}, Lcom/rnfs/Downloader;->getContentLength(Ljava/net/HttpURLConnection;)J

    move-result-wide v6
    :try_end_2
    .catchall {:try_start_2 .. :try_end_2} :catchall_0

    goto :goto_2

    :catchall_0
    move-exception v0

    move-object/from16 v22, v3

    move-object/from16 v23, v5

    goto/16 :goto_a

    :cond_3
    move/from16 v28, v5

    move-object v5, v4

    move/from16 v4, v28

    :goto_2
    if-lt v4, v8, :cond_10

    const/16 v8, 0x12c

    if-ge v4, v8, :cond_10

    .line 87
    :try_start_3
    invoke-virtual {v5}, Ljava/net/HttpURLConnection;->getHeaderFields()Ljava/util/Map;

    move-result-object v8

    .line 89
    new-instance v11, Ljava/util/HashMap;

    invoke-direct {v11}, Ljava/util/HashMap;-><init>()V

    .line 91
    invoke-interface {v8}, Ljava/util/Map;->entrySet()Ljava/util/Set;

    move-result-object v8

    invoke-interface {v8}, Ljava/util/Set;->iterator()Ljava/util/Iterator;

    move-result-object v8

    :cond_4
    :goto_3
    invoke-interface {v8}, Ljava/util/Iterator;->hasNext()Z

    move-result v12
    :try_end_3
    .catchall {:try_start_3 .. :try_end_3} :catchall_5

    if-eqz v12, :cond_5

    :try_start_4
    invoke-interface {v8}, Ljava/util/Iterator;->next()Ljava/lang/Object;

    move-result-object v12

    check-cast v12, Ljava/util/Map$Entry;

    .line 92
    invoke-interface {v12}, Ljava/util/Map$Entry;->getKey()Ljava/lang/Object;

    move-result-object v13

    check-cast v13, Ljava/lang/String;

    .line 93
    invoke-interface {v12}, Ljava/util/Map$Entry;->getValue()Ljava/lang/Object;

    move-result-object v12

    check-cast v12, Ljava/util/List;

    invoke-interface {v12, v10}, Ljava/util/List;->get(I)Ljava/lang/Object;

    move-result-object v12

    check-cast v12, Ljava/lang/String;

    if-eqz v13, :cond_4

    if-eqz v12, :cond_4

    .line 96
    invoke-interface {v11, v13, v12}, Ljava/util/Map;->put(Ljava/lang/Object;Ljava/lang/Object;)Ljava/lang/Object;
    :try_end_4
    .catchall {:try_start_4 .. :try_end_4} :catchall_0

    goto :goto_3

    .line 100
    :cond_5
    :try_start_5
    iget-object v8, v1, Lcom/rnfs/Downloader;->mParam:Lcom/rnfs/DownloadParams;

    iget-object v8, v8, Lcom/rnfs/DownloadParams;->onDownloadBegin:Lcom/rnfs/DownloadParams$OnDownloadBegin;
    :try_end_5
    .catchall {:try_start_5 .. :try_end_5} :catchall_5

    if-eqz v8, :cond_6

    .line 101
    :try_start_6
    iget-object v8, v1, Lcom/rnfs/Downloader;->mParam:Lcom/rnfs/DownloadParams;

    iget-object v8, v8, Lcom/rnfs/DownloadParams;->onDownloadBegin:Lcom/rnfs/DownloadParams$OnDownloadBegin;

    invoke-interface {v8, v4, v6, v7, v11}, Lcom/rnfs/DownloadParams$OnDownloadBegin;->onDownloadBegin(IJLjava/util/Map;)V
    :try_end_6
    .catchall {:try_start_6 .. :try_end_6} :catchall_0

    .line 104
    :cond_6
    :try_start_7
    new-instance v8, Ljava/io/BufferedInputStream;

    invoke-virtual {v5}, Ljava/net/HttpURLConnection;->getInputStream()Ljava/io/InputStream;

    move-result-object v11

    const/16 v12, 0x2000

    invoke-direct {v8, v11, v12}, Ljava/io/BufferedInputStream;-><init>(Ljava/io/InputStream;I)V
    :try_end_7
    .catchall {:try_start_7 .. :try_end_7} :catchall_5

    .line 105
    :try_start_8
    new-instance v11, Ljava/io/FileOutputStream;

    iget-object v13, v0, Lcom/rnfs/DownloadParams;->dest:Ljava/io/File;

    invoke-direct {v11, v13}, Ljava/io/FileOutputStream;-><init>(Ljava/io/File;)V
    :try_end_8
    .catchall {:try_start_8 .. :try_end_8} :catchall_4

    :try_start_9
    new-array v3, v12, [B

    .line 112
    iget-object v12, v1, Lcom/rnfs/Downloader;->mParam:Lcom/rnfs/DownloadParams;

    iget-object v12, v12, Lcom/rnfs/DownloadParams;->onDownloadProgress:Lcom/rnfs/DownloadParams$OnDownloadProgress;

    if-eqz v12, :cond_7

    const/4 v12, 0x1

    goto :goto_4

    :cond_7
    const/4 v12, 0x0

    :goto_4
    const-wide/16 v15, 0x0

    move-wide v13, v15

    const-wide/16 v19, 0x0

    .line 114
    :goto_5
    invoke-virtual {v8, v3}, Ljava/io/InputStream;->read([B)I

    move-result v10

    const/4 v9, -0x1

    if-eq v10, v9, :cond_f

    .line 115
    iget-object v9, v1, Lcom/rnfs/Downloader;->mAbort:Ljava/util/concurrent/atomic/AtomicBoolean;

    invoke-virtual {v9}, Ljava/util/concurrent/atomic/AtomicBoolean;->get()Z

    move-result v9
    :try_end_9
    .catchall {:try_start_9 .. :try_end_9} :catchall_3

    if-nez v9, :cond_e

    move-object/from16 v22, v8

    int-to-long v8, v10

    add-long/2addr v13, v8

    if-eqz v12, :cond_d

    .line 120
    :try_start_a
    iget v8, v0, Lcom/rnfs/DownloadParams;->progressInterval:I

    if-lez v8, :cond_9

    .line 121
    invoke-static {}, Ljava/lang/System;->currentTimeMillis()J

    move-result-wide v23

    sub-long v25, v23, v15

    .line 122
    iget v8, v0, Lcom/rnfs/DownloadParams;->progressInterval:I

    move/from16 v27, v10

    int-to-long v9, v8

    cmp-long v8, v25, v9

    if-lez v8, :cond_8

    const/4 v8, 0x1

    new-array v9, v8, [[J

    const/4 v10, 0x2

    new-array v10, v10, [J

    const/4 v15, 0x0

    aput-wide v6, v10, v15

    aput-wide v13, v10, v8

    aput-object v10, v9, v15

    .line 124
    invoke-virtual {v1, v9}, Lcom/rnfs/Downloader;->publishProgress([Ljava/lang/Object;)V

    move-wide/from16 v15, v23

    :cond_8
    move v10, v4

    move-object/from16 v23, v5

    move/from16 v4, v27

    const/4 v0, 0x1

    const/4 v5, 0x0

    const-wide/16 v17, 0x0

    goto/16 :goto_7

    :cond_9
    move/from16 v27, v10

    .line 126
    iget v8, v0, Lcom/rnfs/DownloadParams;->progressDivider:F

    const/4 v9, 0x0

    cmpg-float v8, v8, v9

    if-gtz v8, :cond_a

    const/4 v8, 0x1

    new-array v9, v8, [[J

    const/4 v10, 0x2

    new-array v10, v10, [J

    const/16 v21, 0x0

    aput-wide v6, v10, v21

    aput-wide v13, v10, v8

    aput-object v10, v9, v21

    .line 127
    invoke-virtual {v1, v9}, Lcom/rnfs/Downloader;->publishProgress([Ljava/lang/Object;)V
    :try_end_a
    .catchall {:try_start_a .. :try_end_a} :catchall_1

    move v10, v4

    move-object/from16 v23, v5

    const/4 v0, 0x1

    const-wide/16 v17, 0x0

    goto :goto_6

    :cond_a
    long-to-double v8, v13

    const-wide/high16 v23, 0x4059000000000000L    # 100.0

    mul-double v8, v8, v23

    move v10, v4

    move-object/from16 v23, v5

    long-to-double v4, v6

    div-double/2addr v8, v4

    .line 129
    :try_start_b
    invoke-static {v8, v9}, Ljava/lang/Math;->round(D)J

    move-result-wide v4

    long-to-double v4, v4

    .line 130
    iget v8, v0, Lcom/rnfs/DownloadParams;->progressDivider:F

    float-to-double v8, v8

    rem-double v8, v4, v8

    const-wide/16 v17, 0x0

    cmpl-double v24, v8, v17

    if-nez v24, :cond_c

    cmpl-double v8, v4, v19

    if-nez v8, :cond_b

    cmp-long v8, v13, v6

    if-nez v8, :cond_c

    :cond_b
    const-string v8, "Downloader"

    .line 132
    new-instance v9, Ljava/lang/StringBuilder;

    invoke-direct {v9}, Ljava/lang/StringBuilder;-><init>()V

    const-string v0, "EMIT: "

    invoke-virtual {v9, v0}, Ljava/lang/StringBuilder;->append(Ljava/lang/String;)Ljava/lang/StringBuilder;

    invoke-static {v4, v5}, Ljava/lang/String;->valueOf(D)Ljava/lang/String;

    move-result-object v0

    invoke-virtual {v9, v0}, Ljava/lang/StringBuilder;->append(Ljava/lang/String;)Ljava/lang/StringBuilder;

    const-string v0, ", TOTAL:"

    invoke-virtual {v9, v0}, Ljava/lang/StringBuilder;->append(Ljava/lang/String;)Ljava/lang/StringBuilder;

    invoke-static {v13, v14}, Ljava/lang/String;->valueOf(J)Ljava/lang/String;

    move-result-object v0

    invoke-virtual {v9, v0}, Ljava/lang/StringBuilder;->append(Ljava/lang/String;)Ljava/lang/StringBuilder;

    invoke-virtual {v9}, Ljava/lang/StringBuilder;->toString()Ljava/lang/String;

    move-result-object v0

    invoke-static {v8, v0}, Landroid/util/Log;->d(Ljava/lang/String;Ljava/lang/String;)I

    const/4 v0, 0x1

    new-array v8, v0, [[J

    const/4 v9, 0x2

    new-array v9, v9, [J

    const/16 v19, 0x0

    aput-wide v6, v9, v19

    aput-wide v13, v9, v0

    aput-object v9, v8, v19

    .line 134
    invoke-virtual {v1, v8}, Lcom/rnfs/Downloader;->publishProgress([Ljava/lang/Object;)V

    move-wide/from16 v19, v4

    goto :goto_6

    :cond_c
    const/4 v0, 0x1

    goto :goto_6

    :catchall_1
    move-exception v0

    move-object/from16 v23, v5

    goto :goto_8

    :cond_d
    move-object/from16 v23, v5

    move/from16 v27, v10

    const/4 v0, 0x1

    const-wide/16 v17, 0x0

    move v10, v4

    :goto_6
    move/from16 v4, v27

    const/4 v5, 0x0

    .line 140
    :goto_7
    invoke-virtual {v11, v3, v5, v4}, Ljava/io/OutputStream;->write([BII)V

    move-object/from16 v0, p1

    move v4, v10

    move-object/from16 v8, v22

    move-object/from16 v5, v23

    goto/16 :goto_5

    :cond_e
    move-object/from16 v23, v5

    move-object/from16 v22, v8

    .line 115
    new-instance v0, Ljava/lang/Exception;

    const-string v2, "Download has been aborted"

    invoke-direct {v0, v2}, Ljava/lang/Exception;-><init>(Ljava/lang/String;)V

    throw v0

    :cond_f
    move v10, v4

    move-object/from16 v23, v5

    move-object/from16 v22, v8

    .line 143
    invoke-virtual {v11}, Ljava/io/OutputStream;->flush()V

    .line 144
    iput-wide v13, v2, Lcom/rnfs/DownloadResult;->bytesWritten:J
    :try_end_b
    .catchall {:try_start_b .. :try_end_b} :catchall_2

    move-object v3, v11

    goto :goto_9

    :catchall_2
    move-exception v0

    goto :goto_8

    :catchall_3
    move-exception v0

    move-object/from16 v23, v5

    move-object/from16 v22, v8

    :goto_8
    move-object v3, v11

    goto :goto_a

    :catchall_4
    move-exception v0

    move-object/from16 v23, v5

    move-object/from16 v22, v8

    goto :goto_a

    :catchall_5
    move-exception v0

    move-object/from16 v23, v5

    move-object/from16 v22, v3

    goto :goto_a

    :cond_10
    move v10, v4

    move-object/from16 v23, v5

    move-object/from16 v22, v3

    .line 146
    :goto_9
    :try_start_c
    iput v10, v2, Lcom/rnfs/DownloadResult;->statusCode:I
    :try_end_c
    .catchall {:try_start_c .. :try_end_c} :catchall_6

    if-eqz v3, :cond_11

    .line 148
    invoke-virtual {v3}, Ljava/io/OutputStream;->close()V

    :cond_11
    if-eqz v22, :cond_12

    .line 149
    invoke-virtual/range {v22 .. v22}, Ljava/io/InputStream;->close()V

    :cond_12
    if-eqz v23, :cond_13

    .line 150
    invoke-virtual/range {v23 .. v23}, Ljava/net/HttpURLConnection;->disconnect()V

    :cond_13
    return-void

    :catchall_6
    move-exception v0

    goto :goto_a

    :catchall_7
    move-exception v0

    move-object/from16 v22, v3

    move-object/from16 v23, v4

    goto :goto_a

    :catchall_8
    move-exception v0

    move-object/from16 v22, v3

    move-object/from16 v23, v22

    :goto_a
    if-eqz v3, :cond_14

    .line 148
    invoke-virtual {v3}, Ljava/io/OutputStream;->close()V

    :cond_14
    if-eqz v22, :cond_15

    .line 149
    invoke-virtual/range {v22 .. v22}, Ljava/io/InputStream;->close()V

    :cond_15
    if-eqz v23, :cond_16

    .line 150
    invoke-virtual/range {v23 .. v23}, Ljava/net/HttpURLConnection;->disconnect()V

    .line 151
    :cond_16
    throw v0
.end method

.method private getContentLength(Ljava/net/HttpURLConnection;)J
    .locals 2

    .line 155
    sget v0, Landroid/os/Build$VERSION;->SDK_INT:I

    const/16 v1, 0x18

    if-lt v0, v1, :cond_0

    .line 156
    invoke-virtual {p1}, Ljava/net/HttpURLConnection;->getContentLengthLong()J

    move-result-wide v0

    return-wide v0

    .line 158
    :cond_0
    invoke-virtual {p1}, Ljava/net/HttpURLConnection;->getContentLength()I

    move-result p1

    int-to-long v0, p1

    return-wide v0
.end method


# virtual methods
.method protected varargs doInBackground([Lcom/rnfs/DownloadParams;)Lcom/rnfs/DownloadResult;
    .locals 1

    const/4 v0, 0x0

    .line 24
    aget-object p1, p1, v0

    iput-object p1, p0, Lcom/rnfs/Downloader;->mParam:Lcom/rnfs/DownloadParams;

    .line 25
    new-instance p1, Lcom/rnfs/DownloadResult;

    invoke-direct {p1}, Lcom/rnfs/DownloadResult;-><init>()V

    iput-object p1, p0, Lcom/rnfs/Downloader;->res:Lcom/rnfs/DownloadResult;

    .line 27
    new-instance p1, Ljava/lang/Thread;

    new-instance v0, Lcom/rnfs/Downloader$1;

    invoke-direct {v0, p0}, Lcom/rnfs/Downloader$1;-><init>(Lcom/rnfs/Downloader;)V

    invoke-direct {p1, v0}, Ljava/lang/Thread;-><init>(Ljava/lang/Runnable;)V

    .line 37
    invoke-virtual {p1}, Ljava/lang/Thread;->start()V

    .line 39
    iget-object p1, p0, Lcom/rnfs/Downloader;->res:Lcom/rnfs/DownloadResult;

    return-object p1
.end method

.method protected bridge synthetic doInBackground([Ljava/lang/Object;)Ljava/lang/Object;
    .locals 0

    .line 18
    check-cast p1, [Lcom/rnfs/DownloadParams;

    invoke-virtual {p0, p1}, Lcom/rnfs/Downloader;->doInBackground([Lcom/rnfs/DownloadParams;)Lcom/rnfs/DownloadResult;

    move-result-object p1

    return-object p1
.end method

.method protected onPostExecute(Ljava/lang/Exception;)V
    .locals 0

    return-void
.end method

.method protected bridge synthetic onProgressUpdate([Ljava/lang/Object;)V
    .locals 0

    .line 18
    check-cast p1, [[J

    invoke-virtual {p0, p1}, Lcom/rnfs/Downloader;->onProgressUpdate([[J)V

    return-void
.end method

.method protected varargs onProgressUpdate([[J)V
    .locals 5

    .line 167
    invoke-super {p0, p1}, Landroid/os/AsyncTask;->onProgressUpdate([Ljava/lang/Object;)V

    .line 168
    iget-object v0, p0, Lcom/rnfs/Downloader;->mParam:Lcom/rnfs/DownloadParams;

    iget-object v0, v0, Lcom/rnfs/DownloadParams;->onDownloadProgress:Lcom/rnfs/DownloadParams$OnDownloadProgress;

    if-eqz v0, :cond_0

    .line 169
    iget-object v0, p0, Lcom/rnfs/Downloader;->mParam:Lcom/rnfs/DownloadParams;

    iget-object v0, v0, Lcom/rnfs/DownloadParams;->onDownloadProgress:Lcom/rnfs/DownloadParams$OnDownloadProgress;

    const/4 v1, 0x0

    aget-object v2, p1, v1

    aget-wide v3, v2, v1

    aget-object p1, p1, v1

    const/4 v1, 0x1

    aget-wide v1, p1, v1

    invoke-interface {v0, v3, v4, v1, v2}, Lcom/rnfs/DownloadParams$OnDownloadProgress;->onDownloadProgress(JJ)V

    :cond_0
    return-void
.end method

.method protected stop()V
    .locals 2

    .line 162
    iget-object v0, p0, Lcom/rnfs/Downloader;->mAbort:Ljava/util/concurrent/atomic/AtomicBoolean;

    const/4 v1, 0x1

    invoke-virtual {v0, v1}, Ljava/util/concurrent/atomic/AtomicBoolean;->set(Z)V

    return-void
.end method
