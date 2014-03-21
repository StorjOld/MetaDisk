import web
import hashlib

def sha256(s):
    return hashlib.sha256(str(s)).hexdigest()


urls = ('/', 'PageIndex')
app = web.application(urls, globals())
tpl = web.template.render('t', globals={'sha256': sha256})


class PageIndex:
    def GET(self):
        return tpl.index()


if __name__ == '__main__':
    app.run()
