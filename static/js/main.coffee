# todo: upload the file; for now, just call cb
uploadFile = (cb) ->
    cb()

api = (resource) ->
    'http://node2.storj.io/api/' + resource

GIGABYTE = 1024 * 1024 * 1024

Cookies = {
    set: ((k, v, days) ->
        if days
            date = new Date()
            secs = days * 24 * 60 * 60 * 1000
            date.setTime(date.getTime() + secs)
            expires = '; expires=' + date.toGMTString() + '; max-age=' + secs
        else
            expires = ''

        document.cookie = k + '=' + v + expires + '; path=/'
    ),

    get: ((k) ->
        cookies = document.cookie.split(';')
        for cookie in cookies

            cookie = cookie.trim()
            index = cookie.indexOf('=')
            [name, v] = [cookie.substring(0, index), cookie.substring(index + 1)]

            if name is k
                return v
        null
    ),

    kill: ((k) ->
        this.set(k, '', -11)
    )
}

History = {
    add: ((file) ->
        stuff = JSON.parse(Cookies.get('history'))
        stuff.push(file)
        Cookies.set('history', JSON.stringify(stuff))
    ),
    get: (-> Cookies.get('history')),
    kill: (-> Cookies.kill('history'))
}

loadStats = ->
    $.getJSON api('bandwidth/usage'), (usage) ->
        usage.current.incoming /= GIGABYTE
        usage.current.outgoing /= GIGABYTE

        $.getJSON api('bandwidth/limits'), (limits) ->
            if limits.incoming is 0
                $('#bar-ul-bandwidth').css('width', '0%')
                $('#cont-ul-bandwidth').html(usage.current.incoming.toFixed(2) + '/&infin; GB')
            else
                limits.incoming /= GIGABYTE
                $('#bar-ul-bandwidth').css('width', (usage.current.incoming / limits.incoming * 100) + '%')
                $('#cont-ul-bandwidth').text(usage.current.incoming.toFixed(2) + '/' + limits.incoming.toFixed(2) + ' GB')

            if limits.outgoing is 0
                $('#bar-dl-bandwidth').css('width', '0%')
                $('#cont-dl-bandwidth').html(usage.current.outgoing.toFixed(2) + '/&infin; GB')
            else
                limits.outgoing /= GIGABYTE
                $('#bar-dl-bandwidth').css('width', (usage.current.outgoing / limits.outgoing * 100) + '%')
                $('#cont-dl-bandwidth').text(usage.current.outgoing.toFixed(2) + '/' + limits.outgoing.toFixed(2) + ' GB')

    $.getJSON api('storage/usage'), (usage) ->
        usage = usage.usage / GIGABYTE

        $.getJSON api('storage/capacity'), (capacity) ->
            capacity = capacity.capacity / GIGABYTE

            $('#bar-storage').css('width', (usage / capacity * 100) + '%')
            $('#cont-storage').text(usage.toFixed(2) + '/' + capacity.toFixed(2) + ' GB')

    $.getJSON api('dtc/address'), (addr) ->
        $('#cont-datacoin-addr')
            .html('<code>' + addr.address + '</code>')
            .find('code').click ->
                selectElementText($(this)[0])

    $.getJSON api('dtc/balance'), (balance) ->
        $('#cont-datacoin-bal').text(balance.balance + ' DTC')

    $.getJSON api('sync/status'), (data) ->
        cloudSize = 0
        for size in [x.filesize for x in data.cloud_queue]
            cloudSize += size / GIGABYTE

        bcSize = 0
        for size in (x.filesize for x in data.blockchain_queue)
            bcSize += size / GIGABYTE

        $('#cont-sync-cloud').text(data.cloud_queue.length + ' (' + cloudSize.toFixed(2) + ' GB)')
        $('#cont-sync-blockchain').text(data.blockchain_queue.length + ' (' + bcSize.toFixed(2) + ' GB)')

loadStats()

showUploadStage = (stage) ->
    # hide all three
    $('#cont-upload').hide()
    $('#cont-uploaded').hide()
    $('#cont-uploading').hide()

    # show the one we want
    $('#cont-' + stage).show()

selectElementText = (el, win) ->
    win = win or window
    doc = win.document

    if win.getSelection and doc.createRange
        sel = win.getSelection()
        range = doc.createRange()
        range.selectNodeContents(el)
        sel.removeAllRanges()
        sel.addRange(range)

    else if doc.body.createTextRange
        range = doc.body.createTextRange()
        range.moveToElementText(el)
        range.select()

handleFileUploaded = (fname) ->
    showUploadStage('uploaded')
    $row = $('<tr/>')
        .addClass('new')
        .append($('<td/>').text(fname))
        .append($('<td/>').html('<code>8c530825981d6f3240a2fcecbafa94859684e3a49c6a1d3205b51154de3f3547</code>'))
        .append($('<td/>').html('<button class="btn btn-sm btn-primary">Download</button>'))

    $row.find('code').click ->
        selectElementText($(this)[0])

    $('#cont-file-list').prepend($row).find('tr').last().remove()

$('#cont-file-list tr code').click ->
    selectElementText($(this)[0])

# when a file is selected
$('#in-upload').change ->
    console.log 'what f;alskfj fuck'
    showUploadStage('uploading')
    console.log 'wsdjf;adlksjf'
    fname = $(this).val().split('\\').pop()
    console.log 'a298taioj'
    formData = new FormData($('#form-file-upload')[0])

    console.log 'what theas;dlkjf;alskfj fuck'

    $('#span-up-prog')
        .css('width', '0%')
        .text('0%')

    console.log 'asdfwhat the fuck'

    progressHandler = (e) ->
        perc = (e.loaded / e.total * 100)
        $('#span-up-prog')
            .css('width', perc + '%')
            .text(Math.round(perc) + '%')

    $.ajax {
        url: api('upload'),
        type: 'POST',
        xhr: (->
            xhr = $.ajaxSettings.xhr()
            if xhr.upload
                xhr.upload.addEventListener('progress', progressHandler, false)
            xhr
        ),
        data: formData,
        cache: false,
        contentType: false,
        processData: false,
        success: ((data) ->
            console.log data
            handleFileUploaded(fname)
        )
    }

# select the link when the user focuses or clicks
$('#span-dl-link').focus -> $(this).select()
$('#span-dl-link').click -> $(this).select()

$('#btn-upload-another').click ->
    showUploadStage('upload')
