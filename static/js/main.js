(function() {
  var accessTokenCopy, addFile, currentPage, downloadUrl, files, gigabytes, gigabytes_ratio, initFilePages, loadPersonal, loadStats, makeHandler, pageCount, percentage, pickFilePage, pickPagination, redeem, selectElementText, showUploadStage, uploadFile, uploadFiles;

  var api = function(resource) {
    return API_BASE_URL + "api/" + resource;
  };

  var accounts_api = {
    url: function(resource) {
      return API_BASE_URL + "accounts/" + resource;
    },

    create: function(callback) {
      return $.post(this.url("token/new"), function(data) {
        callback(data["token"]);
      });
    },

    balance: function(token, callback) {
      return $.getJSON(this.url("token/balance/" + token), function(data) {
        callback(data["balance"]);
      });
    },

    redeem_promocode: function(token, promocode) {
      return $.ajax({
        type: 'POST',
        url:  this.url("token/redeem/" + token),
        data: JSON.stringify({promocode: promocode}),
        contentType: 'application/json; charset=UTF-8'
      });
    }
  };

  var GIGABYTE = 1024 * 1024 * 1024;

  var Cookies = {
    set: (function(k, v, days) {
      var date, expires, secs;
      if (days) {
        date = new Date();
        secs = days * 24 * 60 * 60 * 1000;
        date.setTime(date.getTime() + secs);
        expires = "; expires=" + date.toGMTString() + "; max-age=" + secs;
      } else {
        expires = "";
      }
      document.cookie = k + "=" + v + expires + "; path=/";
      return v;
    }),
    get: (function(k) {
      var cookie, cookies, index, name, v, _i, _len, _ref;
      cookies = document.cookie.split(";");
      _i = 0;
      _len = cookies.length;
      while (_i < _len) {
        cookie = cookies[_i];
        cookie = cookie.trim();
        index = cookie.indexOf("=");
        _ref = [cookie.substring(0, index), cookie.substring(index + 1)];
        name = _ref[0];
        v = _ref[1];
        if (name === k) {
          return v;
        }
        _i++;
      }
      return null;
    }),
    kill: (function(k) {
      return this.set(k, "", -11);
    })
  };

  var LocalStorage = {
    set: (function(k, v) {
      localStorage.setItem(k, v);
      return v;
    }),
    get: (function(k) {
      return localStorage.getItem(k);
    }),
    kill: (function(k) {
      return localStorage.removeItem(k);
    })
  };

  var KeyValueStore = LocalStorage;

  var History = {
    add: (function(file) {
      var stuff;
      stuff = this.get();
      stuff.unshift(file);
      return KeyValueStore.set("history", JSON.stringify(stuff));
    }),
    get: (function() {
      return JSON.parse(KeyValueStore.get("history")) || [];
    }),
    kill: (function() {
      return KeyValueStore.kill("history");
    })
  };

  var AccessToken = {
    get: (function(callback) {
      var token;
      token = KeyValueStore.get("access-token");
      if (token) {
        return callback(token);
      } else {
        return accounts_api.create(function(token) {
          KeyValueStore.set("access-token", token);
          loadPersonal();
          loadStats();
          callback(token);
        });
      }
    }),
    set: function(token) {
      KeyValueStore.set("access-token", token);
      loadPersonal();
      loadStats();
    },
    generate: function() {
      accounts_api.create(function(token) {
        KeyValueStore.set("access-token", token);
        loadPersonal();
        loadStats();

        $.growl({
          title: "Done!",
          icon: "glyphicon glyphicon-ok",
          message: "Successfully created a new access token."
        }, {
          template: {
            icon_type: "class",
            container: "<div class=\"col-xs-10 col-sm-10 col-md-3 alert alert-success\"></div>"
          },
          position: {
            from: "bottom",
            align: "right"
          }
        });
      }).fail(function() {
        $.growl({
          title: "Whoops!",
          icon: "glyphicon glyphicon-remove",
          message: "Failed to create a new access token."
        }, {
          template: {
            icon_type: "class",
            container: "<div class=\"col-xs-10 col-sm-10 col-md-3 alert alert-danger\"></div>"
          },
          position: {
            from: "bottom",
            align: "right"
          }
        });
      });
    }
  };

  gigabytes = function(bytes) {
    return (bytes / GIGABYTE).toFixed(2) + " GB";
  };

  gigabytes_ratio = function(bytes, total) {
    if (total === 0) {
      return (bytes / GIGABYTE).toFixed(2) + "/&infin; GB";
    } else {
      return (bytes / GIGABYTE).toFixed(2) + "/" + gigabytes(total);
    }
  };

  percentage = function(bytes, total) {
    if (total === 0) {
      return "0%";
    } else {
      return (100 * bytes / total) + "%";
    }
  };

  loadPersonal = function() {
    return AccessToken.get(function(token) {
      $("#access-token").val(token);
      $("#buy-now").data("custom", token);
      return accounts_api.balance(token, function(balance) {
        $("#token-balance").html(gigabytes(balance));
        return $("#token-estimated-storage").html(gigabytes(balance / 3.0));
      });
    });
  };

  loadStats = function() {
    return $.getJSON(api("status"), function(info) {
      $("#cont-file-size-limit").html(gigabytes(info.storage.max_file_size));
      $("#bar-ul-bandwidth").css("width", percentage(info.bandwidth.current.incoming, info.bandwidth.limits.incoming));
      $("#cont-ul-bandwidth").html(gigabytes_ratio(info.bandwidth.current.incoming, info.bandwidth.limits.incoming));
      $("#bar-dl-bandwidth").css("width", percentage(info.bandwidth.current.outgoing, info.bandwidth.limits.outgoing));
      $("#cont-dl-bandwidth").html(gigabytes_ratio(info.bandwidth.current.outgoing, info.bandwidth.limits.outgoing));
      $("#bar-storage").css("width", percentage(info.storage.used, info.storage.capacity));
      $("#cont-storage").text(gigabytes_ratio(info.storage.used, info.storage.capacity));
      $("#cont-florincoin-bal").text(info.florincoin.balance + " FLO");
      $("#cont-florincoin-addr").html("<code>" + info.florincoin.address + "</code>").find("code").on("click", function() {
        return selectElementText($(this)[0]);
      });
      $("#cont-sync-cloud").text(info.sync.cloud_queue.count + " (" + gigabytes(info.sync.cloud_queue.size) + ")");
      return $("#cont-sync-blockchain").text(info.sync.blockchain_queue.count + " (" + gigabytes(info.sync.blockchain_queue.size) + ")");
    });
  };

  loadPersonal();

  loadStats();

  showUploadStage = function(stage) {
    $("#cont-upload").hide();
    $("#cont-uploaded").hide();
    $("#cont-uploading").hide();
    return $("#cont-" + stage).show();
  };

  selectElementText = function(el, win) {
    var doc, range, sel;
    win = win || window;
    doc = win.document;
    if (win.getSelection && doc.createRange) {
      sel = win.getSelection();
      range = doc.createRange();
      range.selectNodeContents(el);
      sel.removeAllRanges();
      return sel.addRange(range);
    } else if (doc.body.createTextRange) {
      range = doc.body.createTextRange();
      range.moveToElementText(el);
      return range.select();
    }
  };

  downloadUrl = function(file, token) {
    var queryString;
    queryString = {};
    if (file.key) {
      queryString["key"] = file.key;
    }
    if (token) {
      queryString["token"] = token;
    }
    return api("download/" + file.fhash + "?" + $.param(queryString));
  };

  addFile = function(file) {
    var $file, $fileCode, downloadUrlCopy, fileHashCopy;
    $file = $("<div/>").addClass("file-row cf").append($("<div/>").addClass("left").append("<div class=\"name\">" + file.fname + "</div>").append("<div class=\"hash\"><code>" + file.fhash + " + key</code></div>")).append($("<div/>").addClass("right").append("<button class=\"btn btn-dl\"><i class=\"fa fa-download\"></i>Download</button>")).append($("<div/>").addClass("right").append("<button class=\"btn btn-copy-url\"><i class=\"fa fa-clipboard\"></i>Copy URL</button>")).appendTo($("#cont-file-list"));
    $file.find("button.btn-dl").on("click", function() {
      return AccessToken.get(function(token) {
        var dlUrl = downloadUrl(file, token);
        $.get(dlUrl, function(){
          return window.location.href = dlUrl;
        }).fail(function() {
          $.growl({
          title: "Whoops!",
          icon: "glyphicon glyphicon-remove",
          message: "We were unable to download your file due to an insufficient balance."
          }, {
            template: {
              icon_type: "class",
              container: "<div class=\"col-xs-10 col-sm-10 col-md-3 alert alert-danger\"></div>"
            },
            position: {
              from: "bottom",
              align: "right"
            }
          });
        });
      });
    });
    downloadUrlCopy = new ZeroClipboard($file.find("button.btn-copy-url"));
    downloadUrlCopy.on("copy", function(e) {
      return e.clipboardData.setData("text/plain", AccessToken.get(function(token) {
        return downloadUrl(file, token);
      }));
    });
    downloadUrlCopy.on("aftercopy", function(e) {
      if (e.success["text/plain"]) {
        $.growl({
          title: "Done!",
          icon: "glyphicon glyphicon-ok",
          message: "Successfully copied the download URL."
        }, {
          template: {
            icon_type: "class",
            container: "<div class=\"col-xs-10 col-sm-10 col-md-3 alert alert-success\"></div>"
          },
          position: {
            from: "bottom",
            align: "right"
          }
        });
      } else {
        $.growl({
          title: "Whoops!",
          icon: "glyphicon glyphicon-remove",
          message: "Failed to copy the download URL."
        }, {
          template: {
            icon_type: "class",
            container: "<div class=\"col-xs-10 col-sm-10 col-md-3 alert alert-danger\"></div>"
          },
          position: {
            from: "bottom",
            align: "right"
          }
        });
      }
    });
    $fileCode = $file.find("code");
    fileHashCopy = new ZeroClipboard($fileCode);
    fileHashCopy.on("copy", function(e) {
      return e.clipboardData.setData("text/plain", file.fhash + "?key=" + file.key);
    });
    return fileHashCopy.on("aftercopy", function(e) {
      if (e.success["text/plain"]) {
        $.growl({
          title: "Done!",
          icon: "glyphicon glyphicon-ok",
          message: "Successfully copied the file hash and key."
        }, {
          template: {
            icon_type: "class",
            container: "<div class=\"col-xs-10 col-sm-10 col-md-3 alert alert-success\"></div>"
          },
          position: {
            from: "bottom",
            align: "right"
          }
        });
      } else {
        $.growl({
          title: "Whoops!",
          icon: "glyphicon glyphicon-remove",
          message: "Failed to copy the file hash and key."
        }, {
          template: {
            icon_type: "class",
            container: "<div class=\"col-xs-10 col-sm-10 col-md-3 alert alert-danger\"></div>"
          },
          position: {
            from: "bottom",
            align: "right"
          }
        });
      }
    });
  };

  makeHandler = function(fname) {
    return function(response) {
      var file, page;
      loadPersonal();
      file = {
        fname: fname,
        fhash: response.filehash,
        key: response.key
      };
      History.add(file);
      showUploadStage("uploaded");
      AccessToken.get(function(token) {
        return $("#span-dl-link").val(downloadUrl(file, token));
      });
      page = currentPage();
      initFilePages();
      pickFilePage(page);
      return loadStats();
    };
  };

  $("#in-upload").on("change", function() {
    return uploadFiles(this.files);
  });

  uploadFiles = function(files) {
    return AccessToken.get(function(token) {
      var file, _i, _len, _results;
      _results = [];
      _i = 0;
      _len = files.length;
      while (_i < _len) {
        file = files[_i];
        _results.push(uploadFile(token, file));
        _i++;
      }
      return _results;
    });
  };

  uploadFile = function(token, file) {
    var fname, formData, progressHandler;
    fname = file.name;
    formData = new FormData();
    formData.append("token", token);
    formData.append("file", file);
    showUploadStage("uploading");
    $("#span-up-prog").css("width", "0%").text("0%");
    progressHandler = function(e) {
      var perc;
      perc = e.loaded / e.total * 100;
      return $("#span-up-prog").css("width", perc + "%").text(Math.round(perc) + "%");
    };
    return $.ajax({
      url: api("upload"),
      type: "POST",
      xhr: (function() {
        var xhr;
        xhr = $.ajaxSettings.xhr();
        if (xhr.upload) {
          xhr.upload.addEventListener("progress", progressHandler, false);
        }
        return xhr;
      }),
      data: formData,
      cache: false,
      contentType: false,
      processData: false,
      success: makeHandler(fname)
    });
  };

  $("body").on("dragenter", (function(e) {
    e.preventDefault();
    return e.stopPropagation();
  }));

  $("body").on("dragover", (function(e) {
    e.preventDefault();
    return e.stopPropagation();
  }));

  $("body").on("drop", (function(e) {
    uploadFiles(e.originalEvent.dataTransfer.files);
    e.preventDefault();
    return e.stopPropagation();
  }));

  redeem = function(promocode, token) {
    return accounts_api.redeem_promocode(token, promocode).done(function() {
      $('.modal').modal('hide');
      $.growl({
      title: "Done!",
      icon: "glyphicon glyphicon-remove",
      message: "Your space was successfully redeemed."
      }, {
        template: {
          icon_type: "class",
          container: "<div class=\"col-xs-10 col-sm-10 col-md-3 alert alert-success\"></div>"
        },
        position: {
          from: "bottom",
          align: "right"
        }
      });
      return loadPersonal();
    }).fail(function() {
      $('.modal').modal('hide');
      $.growl({
      title: "Whoops!",
      icon: "glyphicon glyphicon-remove",
      message: "We were unable to redeem your space. If you entered a token, please ensure you typed it correctly."
      }, {
        template: {
          icon_type: "class",
          container: "<div class=\"col-xs-10 col-sm-10 col-md-3 alert alert-danger\"></div>"
        },
        position: {
          from: "bottom",
          align: "right"
        }
      });
    });
  };

  $("#redeem-promocode").on("click", function() {
    return AccessToken.get(function(token) {
      return redeem($("#promocode").val(), token);
    });
  });

  $("#say-please").on("click", function() {
    return AccessToken.get(function(token) {
      return redeem("PLEASE", token);
    });
  });

  //Search functionality
  $(".searchbox input[name=search]").on("keypress", function(e) {
    if (e.which === 13) {
      var searchStr = $(this).val();
      var searchRegex = /[0-9a-zA-z]+\?key\=[0-9a-zA-z]+/;
      if (searchRegex.test(searchStr)) {
        $(this).val('');
        var searchHash = searchStr.split('?key=')[0];
        var searchKey = searchStr.split('?key=')[1];
        $.get(api('find/' + searchHash), function(data) {
          $.growl({
          title: "Done!",
          icon: "glyphicon glyphicon-remove",
          message: "Your file was found and has been added to your uploads list."
          }, {
            template: {
              icon_type: "class",
              container: "<div class=\"col-xs-10 col-sm-10 col-md-3 alert alert-success\"></div>"
            },
            position: {
              from: "bottom",
              align: "right"
            }
          });

          //Actually add file to uploads list
          loadPersonal();
          var file = {
            fname: data['filename'],
            fhash: searchHash,
            key: searchKey
          };
          History.add(file);
          page = currentPage();
          initFilePages();
          pickFilePage(page);
          loadStats();
        }).fail(function() {
          $.growl({
          title: "Whoops!",
          icon: "glyphicon glyphicon-remove",
          message: "We were unable to find your file. Please ensure you typed the hash correctly."
          }, {
            template: {
              icon_type: "class",
              container: "<div class=\"col-xs-10 col-sm-10 col-md-3 alert alert-danger\"></div>"
            },
            position: {
              from: "bottom",
              align: "right"
            }
          });
        });
      } else {
        $.growl({
          title: "Whoops!",
          icon: "glyphicon glyphicon-remove",
          message: "Your search query needs to be in the form [hash]?key=[key]."
        }, {
          template: {
            icon_type: "class",
            container: "<div class=\"col-xs-10 col-sm-10 col-md-3 alert alert-danger\"></div>"
          },
          position: {
            from: "bottom",
            align: "right"
          }
        });
      }
    }
  });

  $("#span-dl-link").on("focus", function() {
    $(this).select();
  });

  $("#span-dl-link").on("click", function() {
    $(this).select();
  });

  $("#btn-upload-another").on("click", function() {
    showUploadStage("upload");
  });

  $("#access-token-refresh").on("click", function() {
    AccessToken.generate();
  });

  $("#access-token-edit").on("click", function() {
    $("#access-token").attr("disabled", false);
  });

  $("#access-token").on("keyup blur", function(e) {
    if (e.type === "blur" || (e.type === "keyup" && e.keyCode === 13)) {
      $("#access-token").attr("disabled", true);
      AccessToken.set($("#access-token").val());
    }
  });

  accessTokenCopy = new ZeroClipboard($("#access-token-copy"));

  accessTokenCopy.on("copy", function(e) {
    e.clipboardData.setData("text/plain", $("#access-token").val());
  });

  accessTokenCopy.on("aftercopy", function(e) {
    if (e.success["text/plain"]) {
      $.growl({
        title: "Done!",
        icon: "glyphicon glyphicon-ok",
        message: "Successfully copied your access token."
      }, {
        template: {
          icon_type: "class",
          container: "<div class=\"col-xs-10 col-sm-10 col-md-3 alert alert-success\"></div>"
        },
        position: {
          from: "bottom",
          align: "right"
        }
      });
    } else {
      $.growl({
        title: "Whoops!",
        icon: "glyphicon glyphicon-remove",
        message: "Failed to copy your access token."
      }, {
        template: {
          icon_type: "class",
          container: "<div class=\"col-xs-10 col-sm-10 col-md-3 alert alert-danger\"></div>"
        },
        position: {
          from: "bottom",
          align: "right"
        }
      });
    }
  });

  files = History.get();

  currentPage = function() {
    return parseInt($("#cont-pagination").attr("data-current")) | 0;
  };

  pageCount = function() {
    return parseInt((History.get().length + 9) / 10);
  };

  pickPagination = function(page) {
    $("#cont-pagination").attr("data-current", page);
    return $("#cont-pagination button").each(function() {
      var found;
      found = false;
      if (!isNaN($(this).attr("data-id"))) {
        if (parseInt($(this).attr("data-id")) === page) {
          found = true;
        }
      }
      return $(this).prop("disabled", found);
    });
  };

  pickFilePage = function(page) {
    var file, _i, _len, _ref;
    if (page === "next") {
      page = Math.min(currentPage() + 1, pageCount() - 1);
    }
    if (page === "prev") {
      page = Math.max(0, currentPage() - 1);
    }
    page = parseInt(page);
    $("#cont-file-list").empty();
    _ref = History.get().slice(page * 10, (page + 1) * 10);
    _i = 0;
    _len = _ref.length;
    while (_i < _len) {
      file = _ref[_i];
      addFile(file);
      _i++;
    }
    return pickPagination(page);
  };

  initFilePages = function() {
    var $cont, i, _i, _ref;
    $cont = $("#cont-pagination");
    $cont.empty();
    $cont.append("<button data-id=\"prev\" type=\"button\" class=\"btn btn-default\"><i class=\"fa fa-arrow-circle-left\"></i></button>");
    i = _i = 0;
    _ref = pageCount();
    while ((0 <= _ref ? _i < _ref : _i > _ref)) {
      $cont.append("<button data-id=\"" + i + "\" type=\"button\" class=\"btn btn-default\">" + (i + 1) + "</button>");
      i = (0 <= _ref ? ++_i : --_i);
    }
    $cont.append("<button data-id=\"next\" type=\"button\" class=\"btn btn-default\"><i class=\"fa fa-arrow-circle-right\"></i></button>");
    $cont.find("button").on("click", function() {
      return pickFilePage($(this).attr("data-id"));
    });
    return pickFilePage(0);
  };

  initFilePages();

  // Coinbase buy button
  $('#buy-now').click(function(){
    $('#modalBuy').modal('hide');
    $(document).trigger('coinbase_show_modal', '6abcf04559966d00b230920ec5d09920');
    return false;
  });

  // Coinbase success
  $(document).on('coinbase_payment_complete', function(event, code){
    loadPersonal();
    loadStats();
    $.growl({
      title: "Done!",
      icon: "glyphicon glyphicon-ok",
      message: "You've got an additional 100GB bandwidth."
    }, {
      template: {
        icon_type: "class",
        container: "<div class=\"col-xs-10 col-sm-10 col-md-3 alert alert-success\"></div>"
      },
      position: {
        from: "bottom",
        align: "right"
      }
    });
  });

  // Tooltips
  $('.tooltip-icon').tooltip({ placement: 'top'});

  // Sharing Key toggle visibility
  $('.sharing-key-toggle').click(function() {
    $(this).find('.btn').toggleClass('active');
    $(this).find('.btn').toggleClass('btn-primary');
    $(this).find('.btn').toggleClass('btn-default');
  });

}).call(this);
