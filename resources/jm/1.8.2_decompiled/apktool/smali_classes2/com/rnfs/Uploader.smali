.class public Lcom/rnfs/Uploader;
.super Landroid/os/AsyncTask;
.source "Uploader.java"


# annotations
.annotation system Ldalvik/annotation/Signature;
    value = {
        "Landroid/os/AsyncTask<",
        "Lcom/rnfs/UploadParams;",
        "[I",
        "Lcom/rnfs/UploadResult;",
        ">;"
    }
.end annotation


# instance fields
.field private mAbort:Ljava/util/concurrent/atomic/AtomicBoolean;

.field private mParams:Lcom/rnfs/UploadParams;

.field private res:Lcom/rnfs/UploadResult;


# direct methods
.method public constructor <init>()V
    .locals 2

    .line 26
    invoke-direct {p0}, Landroid/os/AsyncTask;-><init>()V

    .line 29
    new-instance v0, Ljava/util/concurrent/atomic/AtomicBoolean;

    const/4 v1, 0x0

    invoke-direct {v0, v1}, Ljava/util/concurrent/atomic/AtomicBoolean;-><init>(Z)V

    iput-object v0, p0, Lcom/rnfs/Uploader;->mAbort:Ljava/util/concurrent/atomic/AtomicBoolean;

    return-void
.end method

.method static synthetic access$000(Lcom/rnfs/Uploader;)Lcom/rnfs/UploadParams;
    .locals 0

    .line 26
    iget-object p0, p0, Lcom/rnfs/Uploader;->mParams:Lcom/rnfs/UploadParams;

    return-object p0
.end method

.method static synthetic access$100(Lcom/rnfs/Uploader;)Lcom/rnfs/UploadResult;
    .locals 0

    .line 26
    iget-object p0, p0, Lcom/rnfs/Uploader;->res:Lcom/rnfs/UploadResult;

    return-object p0
.end method

.method static synthetic access$200(Lcom/rnfs/Uploader;Lcom/rnfs/UploadParams;Lcom/rnfs/UploadResult;)V
    .locals 0
    .annotation system Ldalvik/annotation/Throws;
        value = {
            Ljava/lang/Exception;
        }
    .end annotation

    .line 26
    invoke-direct {p0, p1, p2}, Lcom/rnfs/Uploader;->upload(Lcom/rnfs/UploadParams;Lcom/rnfs/UploadResult;)V

    return-void
.end method

.method private upload(Lcom/rnfs/UploadParams;Lcom/rnfs/UploadResult;)V
    .locals 32
    .annotation system Ldalvik/annotation/Throws;
        value = {
            Ljava/lang/Exception;
        }
    .end annotation

    move-object/from16 v1, p0

    move-object/from16 v0, p1

    const-string v2, "filename"

    const-string v3, "name"

    .line 56
    new-instance v4, Ljava/lang/StringBuilder;

    invoke-direct {v4}, Ljava/lang/StringBuilder;-><init>()V

    const-string v5, "\r\n"

    invoke-virtual {v4, v5}, Ljava/lang/StringBuilder;->append(Ljava/lang/String;)Ljava/lang/StringBuilder;

    const-string v6, "--"

    invoke-virtual {v4, v6}, Ljava/lang/StringBuilder;->append(Ljava/lang/String;)Ljava/lang/StringBuilder;

    const-string v7, "*****"

    invoke-virtual {v4, v7}, Ljava/lang/StringBuilder;->append(Ljava/lang/String;)Ljava/lang/StringBuilder;

    invoke-virtual {v4, v6}, Ljava/lang/StringBuilder;->append(Ljava/lang/String;)Ljava/lang/StringBuilder;

    invoke-virtual {v4, v5}, Ljava/lang/StringBuilder;->append(Ljava/lang/String;)Ljava/lang/StringBuilder;

    invoke-virtual {v4}, Ljava/lang/StringBuilder;->toString()Ljava/lang/String;

    move-result-object v4

    .line 66
    :try_start_0
    iget-object v9, v0, Lcom/rnfs/UploadParams;->files:Ljava/util/ArrayList;

    invoke-virtual {v9}, Ljava/util/ArrayList;->toArray()[Ljava/lang/Object;

    move-result-object v9

    .line 67
    iget-boolean v10, v0, Lcom/rnfs/UploadParams;->binaryStreamOnly:Z

    .line 69
    iget-object v11, v0, Lcom/rnfs/UploadParams;->src:Ljava/net/URL;

    invoke-virtual {v11}, Ljava/net/URL;->openConnection()Ljava/net/URLConnection;

    move-result-object v11

    check-cast v11, Ljava/net/HttpURLConnection;
    :try_end_0
    .catchall {:try_start_0 .. :try_end_0} :catchall_6

    const/4 v12, 0x1

    .line 70
    :try_start_1
    invoke-virtual {v11, v12}, Ljava/net/HttpURLConnection;->setDoOutput(Z)V

    .line 71
    iget-object v13, v0, Lcom/rnfs/UploadParams;->headers:Lcom/facebook/react/bridge/ReadableMap;

    invoke-interface {v13}, Lcom/facebook/react/bridge/ReadableMap;->keySetIterator()Lcom/facebook/react/bridge/ReadableMapKeySetIterator;

    move-result-object v13

    .line 72
    iget-object v14, v0, Lcom/rnfs/UploadParams;->method:Ljava/lang/String;

    invoke-virtual {v11, v14}, Ljava/net/HttpURLConnection;->setRequestMethod(Ljava/lang/String;)V

    if-nez v10, :cond_0

    const-string v14, "Content-Type"

    .line 74
    new-instance v15, Ljava/lang/StringBuilder;

    invoke-direct {v15}, Ljava/lang/StringBuilder;-><init>()V

    const-string v8, "multipart/form-data;boundary="

    invoke-virtual {v15, v8}, Ljava/lang/StringBuilder;->append(Ljava/lang/String;)Ljava/lang/StringBuilder;

    invoke-virtual {v15, v7}, Ljava/lang/StringBuilder;->append(Ljava/lang/String;)Ljava/lang/StringBuilder;

    invoke-virtual {v15}, Ljava/lang/StringBuilder;->toString()Ljava/lang/String;

    move-result-object v8

    invoke-virtual {v11, v14, v8}, Ljava/net/HttpURLConnection;->setRequestProperty(Ljava/lang/String;Ljava/lang/String;)V

    .line 76
    :cond_0
    :goto_0
    invoke-interface {v13}, Lcom/facebook/react/bridge/ReadableMapKeySetIterator;->hasNextKey()Z

    move-result v8

    if-eqz v8, :cond_1

    .line 77
    invoke-interface {v13}, Lcom/facebook/react/bridge/ReadableMapKeySetIterator;->nextKey()Ljava/lang/String;

    move-result-object v8

    .line 78
    iget-object v14, v0, Lcom/rnfs/UploadParams;->headers:Lcom/facebook/react/bridge/ReadableMap;

    invoke-interface {v14, v8}, Lcom/facebook/react/bridge/ReadableMap;->getString(Ljava/lang/String;)Ljava/lang/String;

    move-result-object v14

    .line 79
    invoke-virtual {v11, v8, v14}, Ljava/net/HttpURLConnection;->setRequestProperty(Ljava/lang/String;Ljava/lang/String;)V

    goto :goto_0

    .line 82
    :cond_1
    iget-object v8, v0, Lcom/rnfs/UploadParams;->fields:Lcom/facebook/react/bridge/ReadableMap;

    invoke-interface {v8}, Lcom/facebook/react/bridge/ReadableMap;->keySetIterator()Lcom/facebook/react/bridge/ReadableMapKeySetIterator;

    move-result-object v8
    :try_end_1
    .catchall {:try_start_1 .. :try_end_1} :catchall_5

    const-string v13, ""

    move-object v14, v13

    .line 84
    :goto_1
    :try_start_2
    invoke-interface {v8}, Lcom/facebook/react/bridge/ReadableMapKeySetIterator;->hasNextKey()Z

    move-result v15
    :try_end_2
    .catchall {:try_start_2 .. :try_end_2} :catchall_5

    const-string v12, "\""

    move-object/from16 v17, v11

    const-string v11, "Content-Disposition: form-data; name=\""

    if-eqz v15, :cond_2

    .line 85
    :try_start_3
    invoke-interface {v8}, Lcom/facebook/react/bridge/ReadableMapKeySetIterator;->nextKey()Ljava/lang/String;

    move-result-object v15

    move-object/from16 v18, v8

    .line 86
    iget-object v8, v0, Lcom/rnfs/UploadParams;->fields:Lcom/facebook/react/bridge/ReadableMap;

    invoke-interface {v8, v15}, Lcom/facebook/react/bridge/ReadableMap;->getString(Ljava/lang/String;)Ljava/lang/String;

    move-result-object v8

    move-object/from16 v19, v4

    .line 87
    new-instance v4, Ljava/lang/StringBuilder;

    invoke-direct {v4}, Ljava/lang/StringBuilder;-><init>()V

    invoke-virtual {v4, v14}, Ljava/lang/StringBuilder;->append(Ljava/lang/String;)Ljava/lang/StringBuilder;

    invoke-virtual {v4, v6}, Ljava/lang/StringBuilder;->append(Ljava/lang/String;)Ljava/lang/StringBuilder;

    invoke-virtual {v4, v7}, Ljava/lang/StringBuilder;->append(Ljava/lang/String;)Ljava/lang/StringBuilder;

    invoke-virtual {v4, v5}, Ljava/lang/StringBuilder;->append(Ljava/lang/String;)Ljava/lang/StringBuilder;

    invoke-virtual {v4, v11}, Ljava/lang/StringBuilder;->append(Ljava/lang/String;)Ljava/lang/StringBuilder;

    invoke-virtual {v4, v15}, Ljava/lang/StringBuilder;->append(Ljava/lang/String;)Ljava/lang/StringBuilder;

    invoke-virtual {v4, v12}, Ljava/lang/StringBuilder;->append(Ljava/lang/String;)Ljava/lang/StringBuilder;

    invoke-virtual {v4, v5}, Ljava/lang/StringBuilder;->append(Ljava/lang/String;)Ljava/lang/StringBuilder;

    invoke-virtual {v4, v5}, Ljava/lang/StringBuilder;->append(Ljava/lang/String;)Ljava/lang/StringBuilder;

    invoke-virtual {v4, v8}, Ljava/lang/StringBuilder;->append(Ljava/lang/String;)Ljava/lang/StringBuilder;

    invoke-virtual {v4, v5}, Ljava/lang/StringBuilder;->append(Ljava/lang/String;)Ljava/lang/StringBuilder;

    invoke-virtual {v4}, Ljava/lang/StringBuilder;->toString()Ljava/lang/String;

    move-result-object v14

    move-object/from16 v11, v17

    move-object/from16 v8, v18

    move-object/from16 v4, v19

    const/4 v12, 0x1

    goto :goto_1

    :cond_2
    move-object/from16 v19, v4

    .line 89
    new-instance v4, Ljava/lang/StringBuilder;

    invoke-direct {v4}, Ljava/lang/StringBuilder;-><init>()V

    invoke-virtual {v4, v13}, Ljava/lang/StringBuilder;->append(Ljava/lang/String;)Ljava/lang/StringBuilder;

    invoke-virtual {v4, v14}, Ljava/lang/StringBuilder;->append(Ljava/lang/String;)Ljava/lang/StringBuilder;

    invoke-virtual {v4}, Ljava/lang/StringBuilder;->toString()Ljava/lang/String;

    move-result-object v4

    .line 90
    array-length v8, v9

    new-array v8, v8, [Ljava/lang/String;

    .line 91
    iget-object v15, v0, Lcom/rnfs/UploadParams;->files:Ljava/util/ArrayList;

    invoke-virtual {v15}, Ljava/util/ArrayList;->iterator()Ljava/util/Iterator;

    move-result-object v15

    const-wide/16 v20, 0x0

    move-object/from16 v18, v4

    move-object/from16 v22, v5

    move-object/from16 v0, v18

    move-wide/from16 v4, v20

    move-object/from16 v18, v14

    const/4 v14, 0x0

    :goto_2
    invoke-interface {v15}, Ljava/util/Iterator;->hasNext()Z

    move-result v23
    :try_end_3
    .catchall {:try_start_3 .. :try_end_3} :catchall_4

    move-object/from16 v24, v13

    const-string v13, "filepath"

    if-eqz v23, :cond_5

    :try_start_4
    invoke-interface {v15}, Ljava/util/Iterator;->next()Ljava/lang/Object;

    move-result-object v23

    move-object/from16 v25, v15

    move-object/from16 v15, v23

    check-cast v15, Lcom/facebook/react/bridge/ReadableMap;
    :try_end_4
    .catchall {:try_start_4 .. :try_end_4} :catchall_0

    .line 93
    :try_start_5
    invoke-interface {v15, v3}, Lcom/facebook/react/bridge/ReadableMap;->getString(Ljava/lang/String;)Ljava/lang/String;

    move-result-object v23

    .line 94
    invoke-interface {v15, v2}, Lcom/facebook/react/bridge/ReadableMap;->getString(Ljava/lang/String;)Ljava/lang/String;

    move-result-object v26
    :try_end_5
    .catch Lcom/facebook/react/bridge/NoSuchKeyException; {:try_start_5 .. :try_end_5} :catch_0
    .catchall {:try_start_5 .. :try_end_5} :catchall_4

    move-object/from16 v27, v0

    :try_start_6
    const-string v0, "filetype"

    .line 95
    invoke-interface {v15, v0}, Lcom/facebook/react/bridge/ReadableMap;->getString(Ljava/lang/String;)Ljava/lang/String;

    move-result-object v0
    :try_end_6
    .catch Lcom/facebook/react/bridge/NoSuchKeyException; {:try_start_6 .. :try_end_6} :catch_1
    .catchall {:try_start_6 .. :try_end_6} :catchall_4

    :goto_3
    move-object/from16 v31, v3

    move-object v3, v0

    move-object/from16 v0, v23

    move-object/from16 v23, v2

    move-object/from16 v2, v26

    move-object/from16 v26, v31

    goto :goto_4

    :catch_0
    move-object/from16 v27, v0

    .line 97
    :catch_1
    :try_start_7
    invoke-interface {v15, v3}, Lcom/facebook/react/bridge/ReadableMap;->getString(Ljava/lang/String;)Ljava/lang/String;

    move-result-object v23

    .line 98
    invoke-interface {v15, v2}, Lcom/facebook/react/bridge/ReadableMap;->getString(Ljava/lang/String;)Ljava/lang/String;

    move-result-object v26

    .line 99
    invoke-interface {v15, v13}, Lcom/facebook/react/bridge/ReadableMap;->getString(Ljava/lang/String;)Ljava/lang/String;

    move-result-object v0

    invoke-virtual {v1, v0}, Lcom/rnfs/Uploader;->getMimeType(Ljava/lang/String;)Ljava/lang/String;

    move-result-object v0

    goto :goto_3

    .line 101
    :goto_4
    new-instance v1, Ljava/io/File;

    invoke-interface {v15, v13}, Lcom/facebook/react/bridge/ReadableMap;->getString(Ljava/lang/String;)Ljava/lang/String;

    move-result-object v13

    invoke-direct {v1, v13}, Ljava/io/File;-><init>(Ljava/lang/String;)V

    move v15, v14

    .line 102
    invoke-virtual {v1}, Ljava/io/File;->length()J

    move-result-wide v13

    add-long/2addr v4, v13

    if-nez v10, :cond_4

    .line 105
    new-instance v1, Ljava/lang/StringBuilder;

    invoke-direct {v1}, Ljava/lang/StringBuilder;-><init>()V

    invoke-virtual {v1, v6}, Ljava/lang/StringBuilder;->append(Ljava/lang/String;)Ljava/lang/StringBuilder;

    invoke-virtual {v1, v7}, Ljava/lang/StringBuilder;->append(Ljava/lang/String;)Ljava/lang/StringBuilder;

    move-object/from16 v28, v6

    move-object/from16 v6, v22

    invoke-virtual {v1, v6}, Ljava/lang/StringBuilder;->append(Ljava/lang/String;)Ljava/lang/StringBuilder;

    invoke-virtual {v1, v11}, Ljava/lang/StringBuilder;->append(Ljava/lang/String;)Ljava/lang/StringBuilder;

    invoke-virtual {v1, v0}, Ljava/lang/StringBuilder;->append(Ljava/lang/String;)Ljava/lang/StringBuilder;

    const-string v0, "\"; filename=\""

    invoke-virtual {v1, v0}, Ljava/lang/StringBuilder;->append(Ljava/lang/String;)Ljava/lang/StringBuilder;

    invoke-virtual {v1, v2}, Ljava/lang/StringBuilder;->append(Ljava/lang/String;)Ljava/lang/StringBuilder;

    invoke-virtual {v1, v12}, Ljava/lang/StringBuilder;->append(Ljava/lang/String;)Ljava/lang/StringBuilder;

    invoke-virtual {v1, v6}, Ljava/lang/StringBuilder;->append(Ljava/lang/String;)Ljava/lang/StringBuilder;

    const-string v0, "Content-Type: "

    invoke-virtual {v1, v0}, Ljava/lang/StringBuilder;->append(Ljava/lang/String;)Ljava/lang/StringBuilder;

    invoke-virtual {v1, v3}, Ljava/lang/StringBuilder;->append(Ljava/lang/String;)Ljava/lang/StringBuilder;

    invoke-virtual {v1, v6}, Ljava/lang/StringBuilder;->append(Ljava/lang/String;)Ljava/lang/StringBuilder;

    invoke-virtual {v1}, Ljava/lang/StringBuilder;->toString()Ljava/lang/String;

    move-result-object v0

    .line 109
    array-length v1, v9

    const/4 v2, 0x1

    sub-int/2addr v1, v2

    move v3, v15

    if-ne v1, v3, :cond_3

    .line 110
    invoke-virtual/range {v19 .. v19}, Ljava/lang/String;->length()I

    move-result v1

    move v15, v3

    int-to-long v2, v1

    add-long/2addr v4, v2

    goto :goto_5

    :cond_3
    move v15, v3

    .line 113
    :goto_5
    new-instance v1, Ljava/lang/StringBuilder;

    invoke-direct {v1}, Ljava/lang/StringBuilder;-><init>()V

    const-string v2, "Content-length: "

    invoke-virtual {v1, v2}, Ljava/lang/StringBuilder;->append(Ljava/lang/String;)Ljava/lang/StringBuilder;

    invoke-virtual {v1, v13, v14}, Ljava/lang/StringBuilder;->append(J)Ljava/lang/StringBuilder;

    invoke-virtual {v1, v6}, Ljava/lang/StringBuilder;->append(Ljava/lang/String;)Ljava/lang/StringBuilder;

    invoke-virtual {v1}, Ljava/lang/StringBuilder;->toString()Ljava/lang/String;

    move-result-object v1

    .line 114
    new-instance v2, Ljava/lang/StringBuilder;

    invoke-direct {v2}, Ljava/lang/StringBuilder;-><init>()V

    invoke-virtual {v2, v0}, Ljava/lang/StringBuilder;->append(Ljava/lang/String;)Ljava/lang/StringBuilder;

    invoke-virtual {v2, v1}, Ljava/lang/StringBuilder;->append(Ljava/lang/String;)Ljava/lang/StringBuilder;

    invoke-virtual {v2, v6}, Ljava/lang/StringBuilder;->append(Ljava/lang/String;)Ljava/lang/StringBuilder;

    invoke-virtual {v2}, Ljava/lang/StringBuilder;->toString()Ljava/lang/String;

    move-result-object v2

    aput-object v2, v8, v15

    .line 115
    new-instance v2, Ljava/lang/StringBuilder;

    invoke-direct {v2}, Ljava/lang/StringBuilder;-><init>()V

    move-object/from16 v3, v27

    invoke-virtual {v2, v3}, Ljava/lang/StringBuilder;->append(Ljava/lang/String;)Ljava/lang/StringBuilder;

    invoke-virtual {v2, v0}, Ljava/lang/StringBuilder;->append(Ljava/lang/String;)Ljava/lang/StringBuilder;

    invoke-virtual {v2, v1}, Ljava/lang/StringBuilder;->append(Ljava/lang/String;)Ljava/lang/StringBuilder;

    invoke-virtual {v2, v6}, Ljava/lang/StringBuilder;->append(Ljava/lang/String;)Ljava/lang/StringBuilder;

    invoke-virtual {v2}, Ljava/lang/StringBuilder;->toString()Ljava/lang/String;

    move-result-object v0
    :try_end_7
    .catchall {:try_start_7 .. :try_end_7} :catchall_0

    goto :goto_6

    :cond_4
    move-object/from16 v28, v6

    move-object/from16 v6, v22

    move-object/from16 v3, v27

    move-object v0, v3

    :goto_6
    add-int/lit8 v14, v15, 0x1

    move-object/from16 v1, p0

    move-object/from16 v22, v6

    move-object/from16 v2, v23

    move-object/from16 v13, v24

    move-object/from16 v15, v25

    move-object/from16 v3, v26

    move-object/from16 v6, v28

    goto/16 :goto_2

    :catchall_0
    move-exception v0

    const/4 v2, 0x0

    const/4 v3, 0x0

    const/4 v8, 0x0

    move-object/from16 v1, p0

    move-object/from16 v11, v17

    goto/16 :goto_f

    :cond_5
    move-object v3, v0

    move-object/from16 v6, v22

    .line 120
    :try_start_8
    iget-object v0, v1, Lcom/rnfs/Uploader;->mParams:Lcom/rnfs/UploadParams;

    iget-object v0, v0, Lcom/rnfs/UploadParams;->onUploadBegin:Lcom/rnfs/UploadParams$onUploadBegin;

    if-eqz v0, :cond_6

    .line 121
    iget-object v0, v1, Lcom/rnfs/Uploader;->mParams:Lcom/rnfs/UploadParams;

    iget-object v0, v0, Lcom/rnfs/UploadParams;->onUploadBegin:Lcom/rnfs/UploadParams$onUploadBegin;

    invoke-interface {v0}, Lcom/rnfs/UploadParams$onUploadBegin;->onUploadBegin()V

    :cond_6
    if-nez v10, :cond_7

    .line 125
    invoke-virtual {v3}, Ljava/lang/String;->length()I

    move-result v0

    array-length v2, v9

    mul-int/lit8 v2, v2, 0x2

    add-int/2addr v0, v2

    int-to-long v2, v0

    add-long/2addr v2, v4

    const-string v0, "Content-length"

    .line 126
    new-instance v7, Ljava/lang/StringBuilder;

    invoke-direct {v7}, Ljava/lang/StringBuilder;-><init>()V

    move-object/from16 v9, v24

    invoke-virtual {v7, v9}, Ljava/lang/StringBuilder;->append(Ljava/lang/String;)Ljava/lang/StringBuilder;

    long-to-int v3, v2

    invoke-virtual {v7, v3}, Ljava/lang/StringBuilder;->append(I)Ljava/lang/StringBuilder;

    invoke-virtual {v7}, Ljava/lang/StringBuilder;->toString()Ljava/lang/String;

    move-result-object v2
    :try_end_8
    .catchall {:try_start_8 .. :try_end_8} :catchall_4

    move-object/from16 v11, v17

    :try_start_9
    invoke-virtual {v11, v0, v2}, Ljava/net/HttpURLConnection;->setRequestProperty(Ljava/lang/String;Ljava/lang/String;)V

    .line 127
    invoke-virtual {v11, v3}, Ljava/net/HttpURLConnection;->setFixedLengthStreamingMode(I)V

    goto :goto_7

    :cond_7
    move-object/from16 v11, v17

    .line 129
    :goto_7
    invoke-virtual {v11}, Ljava/net/HttpURLConnection;->connect()V

    .line 131
    new-instance v2, Ljava/io/DataOutputStream;

    invoke-virtual {v11}, Ljava/net/HttpURLConnection;->getOutputStream()Ljava/io/OutputStream;

    move-result-object v0

    invoke-direct {v2, v0}, Ljava/io/DataOutputStream;-><init>(Ljava/io/OutputStream;)V
    :try_end_9
    .catchall {:try_start_9 .. :try_end_9} :catchall_5

    .line 132
    :try_start_a
    invoke-static {v2}, Ljava/nio/channels/Channels;->newChannel(Ljava/io/OutputStream;)Ljava/nio/channels/WritableByteChannel;

    move-result-object v0

    if-nez v10, :cond_8

    move-object/from16 v14, v18

    .line 135
    invoke-virtual {v2, v14}, Ljava/io/DataOutputStream;->writeBytes(Ljava/lang/String;)V

    :cond_8
    move-object/from16 v3, p1

    .line 140
    iget-object v3, v3, Lcom/rnfs/UploadParams;->files:Ljava/util/ArrayList;

    invoke-virtual {v3}, Ljava/util/ArrayList;->iterator()Ljava/util/Iterator;

    move-result-object v3

    const/4 v7, 0x0

    const/4 v9, 0x0

    :goto_8
    invoke-interface {v3}, Ljava/util/Iterator;->hasNext()Z

    move-result v12

    if-eqz v12, :cond_d

    invoke-interface {v3}, Ljava/util/Iterator;->next()Ljava/lang/Object;

    move-result-object v12

    check-cast v12, Lcom/facebook/react/bridge/ReadableMap;

    if-nez v10, :cond_9

    .line 142
    aget-object v14, v8, v7

    invoke-virtual {v2, v14}, Ljava/io/DataOutputStream;->writeBytes(Ljava/lang/String;)V

    .line 145
    :cond_9
    new-instance v14, Ljava/io/File;

    invoke-interface {v12, v13}, Lcom/facebook/react/bridge/ReadableMap;->getString(Ljava/lang/String;)Ljava/lang/String;

    move-result-object v12

    invoke-direct {v14, v12}, Ljava/io/File;-><init>(Ljava/lang/String;)V

    move-object v12, v8

    move/from16 p1, v9

    .line 147
    invoke-virtual {v14}, Ljava/io/File;->length()J

    move-result-wide v8

    long-to-float v15, v8

    const/high16 v16, 0x42c80000    # 100.0f

    div-float v15, v15, v16

    move-object/from16 v17, v12

    move-object/from16 v16, v13

    float-to-double v12, v15

    .line 148
    invoke-static {v12, v13}, Ljava/lang/Math;->ceil(D)D

    move-result-wide v12

    double-to-long v12, v12

    .line 151
    new-instance v15, Ljava/io/FileInputStream;

    invoke-direct {v15, v14}, Ljava/io/FileInputStream;-><init>(Ljava/io/File;)V

    .line 152
    invoke-virtual {v15}, Ljava/io/FileInputStream;->getChannel()Ljava/nio/channels/FileChannel;

    move-result-object v14

    move-wide/from16 v29, v20

    move-object/from16 v31, v3

    move/from16 v3, p1

    move-object/from16 p1, v31

    :goto_9
    cmp-long v18, v29, v8

    if-gez v18, :cond_b

    move-object/from16 v23, v14

    move-wide/from16 v24, v29

    move-wide/from16 v26, v12

    move-object/from16 v28, v0

    .line 155
    invoke-virtual/range {v23 .. v28}, Ljava/nio/channels/FileChannel;->transferTo(JJLjava/nio/channels/WritableByteChannel;)J

    move-result-wide v23

    add-long v29, v29, v23

    move-object/from16 v18, v0

    .line 158
    iget-object v0, v1, Lcom/rnfs/Uploader;->mParams:Lcom/rnfs/UploadParams;

    iget-object v0, v0, Lcom/rnfs/UploadParams;->onUploadProgress:Lcom/rnfs/UploadParams$onUploadProgress;

    if-eqz v0, :cond_a

    move-wide/from16 v25, v8

    int-to-long v8, v3

    add-long v8, v8, v23

    long-to-int v3, v8

    .line 160
    iget-object v0, v1, Lcom/rnfs/Uploader;->mParams:Lcom/rnfs/UploadParams;

    iget-object v0, v0, Lcom/rnfs/UploadParams;->onUploadProgress:Lcom/rnfs/UploadParams$onUploadProgress;

    long-to-int v8, v4

    invoke-interface {v0, v8, v3}, Lcom/rnfs/UploadParams$onUploadProgress;->onUploadProgress(II)V

    goto :goto_a

    :cond_a
    move-wide/from16 v25, v8

    :goto_a
    move-object/from16 v0, v18

    move-wide/from16 v8, v25

    goto :goto_9

    :cond_b
    move-object/from16 v18, v0

    if-nez v10, :cond_c

    .line 165
    invoke-virtual {v2, v6}, Ljava/io/DataOutputStream;->writeBytes(Ljava/lang/String;)V

    :cond_c
    add-int/lit8 v7, v7, 0x1

    .line 169
    invoke-virtual {v15}, Ljava/io/FileInputStream;->close()V

    move v9, v3

    move-object/from16 v13, v16

    move-object/from16 v8, v17

    move-object/from16 v0, v18

    move-object/from16 v3, p1

    goto/16 :goto_8

    :cond_d
    if-nez v10, :cond_e

    move-object/from16 v0, v19

    .line 173
    invoke-virtual {v2, v0}, Ljava/io/DataOutputStream;->writeBytes(Ljava/lang/String;)V

    .line 175
    :cond_e
    invoke-virtual {v2}, Ljava/io/DataOutputStream;->flush()V

    .line 176
    invoke-virtual {v2}, Ljava/io/DataOutputStream;->close()V

    .line 178
    new-instance v8, Ljava/io/BufferedInputStream;

    invoke-virtual {v11}, Ljava/net/HttpURLConnection;->getInputStream()Ljava/io/InputStream;

    move-result-object v0

    invoke-direct {v8, v0}, Ljava/io/BufferedInputStream;-><init>(Ljava/io/InputStream;)V
    :try_end_a
    .catchall {:try_start_a .. :try_end_a} :catchall_3

    .line 179
    :try_start_b
    new-instance v3, Ljava/io/BufferedReader;

    new-instance v0, Ljava/io/InputStreamReader;

    invoke-direct {v0, v8}, Ljava/io/InputStreamReader;-><init>(Ljava/io/InputStream;)V

    invoke-direct {v3, v0}, Ljava/io/BufferedReader;-><init>(Ljava/io/Reader;)V
    :try_end_b
    .catchall {:try_start_b .. :try_end_b} :catchall_2

    .line 180
    :try_start_c
    invoke-static {}, Lcom/facebook/react/bridge/Arguments;->createMap()Lcom/facebook/react/bridge/WritableMap;

    move-result-object v0

    .line 181
    invoke-virtual {v11}, Ljava/net/HttpURLConnection;->getHeaderFields()Ljava/util/Map;

    move-result-object v4

    .line 182
    invoke-interface {v4}, Ljava/util/Map;->entrySet()Ljava/util/Set;

    move-result-object v4

    invoke-interface {v4}, Ljava/util/Set;->iterator()Ljava/util/Iterator;

    move-result-object v4

    :goto_b
    invoke-interface {v4}, Ljava/util/Iterator;->hasNext()Z

    move-result v5

    if-eqz v5, :cond_f

    invoke-interface {v4}, Ljava/util/Iterator;->next()Ljava/lang/Object;

    move-result-object v5

    check-cast v5, Ljava/util/Map$Entry;

    .line 184
    invoke-interface {v5}, Ljava/util/Map$Entry;->getKey()Ljava/lang/Object;

    move-result-object v6

    check-cast v6, Ljava/lang/String;

    invoke-interface {v5}, Ljava/util/Map$Entry;->getValue()Ljava/lang/Object;

    move-result-object v5

    check-cast v5, Ljava/util/List;

    const/4 v7, 0x0

    invoke-interface {v5, v7}, Ljava/util/List;->get(I)Ljava/lang/Object;

    move-result-object v5

    check-cast v5, Ljava/lang/String;

    invoke-interface {v0, v6, v5}, Lcom/facebook/react/bridge/WritableMap;->putString(Ljava/lang/String;Ljava/lang/String;)V

    goto :goto_b

    .line 186
    :cond_f
    new-instance v4, Ljava/lang/StringBuilder;

    invoke-direct {v4}, Ljava/lang/StringBuilder;-><init>()V

    .line 189
    :goto_c
    invoke-virtual {v3}, Ljava/io/BufferedReader;->readLine()Ljava/lang/String;

    move-result-object v5

    if-eqz v5, :cond_10

    .line 190
    invoke-virtual {v4, v5}, Ljava/lang/StringBuilder;->append(Ljava/lang/String;)Ljava/lang/StringBuilder;

    const-string v5, "\n"

    invoke-virtual {v4, v5}, Ljava/lang/StringBuilder;->append(Ljava/lang/String;)Ljava/lang/StringBuilder;

    goto :goto_c

    .line 193
    :cond_10
    invoke-virtual {v4}, Ljava/lang/StringBuilder;->toString()Ljava/lang/String;

    move-result-object v4

    .line 194
    invoke-virtual {v11}, Ljava/net/HttpURLConnection;->getResponseCode()I

    move-result v5

    .line 195
    iget-object v6, v1, Lcom/rnfs/Uploader;->res:Lcom/rnfs/UploadResult;

    iput-object v0, v6, Lcom/rnfs/UploadResult;->headers:Lcom/facebook/react/bridge/WritableMap;

    .line 196
    iget-object v0, v1, Lcom/rnfs/Uploader;->res:Lcom/rnfs/UploadResult;

    iput-object v4, v0, Lcom/rnfs/UploadResult;->body:Ljava/lang/String;

    .line 197
    iget-object v0, v1, Lcom/rnfs/Uploader;->res:Lcom/rnfs/UploadResult;

    iput v5, v0, Lcom/rnfs/UploadResult;->statusCode:I
    :try_end_c
    .catchall {:try_start_c .. :try_end_c} :catchall_1

    if-eqz v11, :cond_11

    .line 200
    invoke-virtual {v11}, Ljava/net/HttpURLConnection;->disconnect()V

    .line 202
    :cond_11
    invoke-virtual {v2}, Ljava/io/DataOutputStream;->close()V

    .line 204
    invoke-virtual {v8}, Ljava/io/BufferedInputStream;->close()V

    .line 206
    invoke-virtual {v3}, Ljava/io/BufferedReader;->close()V

    return-void

    :catchall_1
    move-exception v0

    goto :goto_f

    :catchall_2
    move-exception v0

    const/4 v3, 0x0

    goto :goto_f

    :catchall_3
    move-exception v0

    goto :goto_e

    :catchall_4
    move-exception v0

    move-object/from16 v11, v17

    goto :goto_d

    :catchall_5
    move-exception v0

    :goto_d
    const/4 v2, 0x0

    :goto_e
    const/4 v3, 0x0

    const/4 v8, 0x0

    goto :goto_f

    :catchall_6
    move-exception v0

    const/4 v2, 0x0

    const/4 v3, 0x0

    const/4 v8, 0x0

    const/4 v11, 0x0

    :goto_f
    if-eqz v11, :cond_12

    .line 200
    invoke-virtual {v11}, Ljava/net/HttpURLConnection;->disconnect()V

    :cond_12
    if-eqz v2, :cond_13

    .line 202
    invoke-virtual {v2}, Ljava/io/DataOutputStream;->close()V

    :cond_13
    if-eqz v8, :cond_14

    .line 204
    invoke-virtual {v8}, Ljava/io/BufferedInputStream;->close()V

    :cond_14
    if-eqz v3, :cond_15

    .line 206
    invoke-virtual {v3}, Ljava/io/BufferedReader;->close()V

    .line 207
    :cond_15
    throw v0
.end method


# virtual methods
.method protected varargs doInBackground([Lcom/rnfs/UploadParams;)Lcom/rnfs/UploadResult;
    .locals 1

    const/4 v0, 0x0

    .line 33
    aget-object p1, p1, v0

    iput-object p1, p0, Lcom/rnfs/Uploader;->mParams:Lcom/rnfs/UploadParams;

    .line 34
    new-instance p1, Lcom/rnfs/UploadResult;

    invoke-direct {p1}, Lcom/rnfs/UploadResult;-><init>()V

    iput-object p1, p0, Lcom/rnfs/Uploader;->res:Lcom/rnfs/UploadResult;

    .line 35
    new-instance p1, Ljava/lang/Thread;

    new-instance v0, Lcom/rnfs/Uploader$1;

    invoke-direct {v0, p0}, Lcom/rnfs/Uploader$1;-><init>(Lcom/rnfs/Uploader;)V

    invoke-direct {p1, v0}, Ljava/lang/Thread;-><init>(Ljava/lang/Runnable;)V

    .line 46
    invoke-virtual {p1}, Ljava/lang/Thread;->start()V

    .line 47
    iget-object p1, p0, Lcom/rnfs/Uploader;->res:Lcom/rnfs/UploadResult;

    return-object p1
.end method

.method protected bridge synthetic doInBackground([Ljava/lang/Object;)Ljava/lang/Object;
    .locals 0

    .line 26
    check-cast p1, [Lcom/rnfs/UploadParams;

    invoke-virtual {p0, p1}, Lcom/rnfs/Uploader;->doInBackground([Lcom/rnfs/UploadParams;)Lcom/rnfs/UploadResult;

    move-result-object p1

    return-object p1
.end method

.method protected getMimeType(Ljava/lang/String;)Ljava/lang/String;
    .locals 1

    .line 212
    invoke-static {p1}, Landroid/webkit/MimeTypeMap;->getFileExtensionFromUrl(Ljava/lang/String;)Ljava/lang/String;

    move-result-object p1

    if-eqz p1, :cond_0

    .line 214
    invoke-static {}, Landroid/webkit/MimeTypeMap;->getSingleton()Landroid/webkit/MimeTypeMap;

    move-result-object v0

    invoke-virtual {p1}, Ljava/lang/String;->toLowerCase()Ljava/lang/String;

    move-result-object p1

    invoke-virtual {v0, p1}, Landroid/webkit/MimeTypeMap;->getMimeTypeFromExtension(Ljava/lang/String;)Ljava/lang/String;

    move-result-object p1

    goto :goto_0

    :cond_0
    const/4 p1, 0x0

    :goto_0
    if-nez p1, :cond_1

    const-string p1, "*/*"

    :cond_1
    return-object p1
.end method

.method protected stop()V
    .locals 2

    .line 223
    iget-object v0, p0, Lcom/rnfs/Uploader;->mAbort:Ljava/util/concurrent/atomic/AtomicBoolean;

    const/4 v1, 0x1

    invoke-virtual {v0, v1}, Ljava/util/concurrent/atomic/AtomicBoolean;->set(Z)V

    return-void
.end method
