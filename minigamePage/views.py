from django.shortcuts import render
from django.template import Context, loader
from django.http import HttpResponse

# Create your views here.
def index(request):
    template = loader.get_template("minigame.html")
    return HttpResponse(template.render({}, request))